/**
 * Model catalog availability — admin truth + user-facing filters.
 * Does not expose provider costs to normal users.
 */
import type { AIModel } from "@/lib/data";
import { aiModels } from "@/lib/data";
import { evaluateModelEligibility, type SmokeModelRow } from "@/lib/ai/model-smoke-test";
import { toApiModelId } from "@/lib/ai/model-catalog";
import { getProviderStatus, isProviderSelectable } from "@/lib/ai/provider-availability";

export type ModelAvailabilityClass =
  | "available_now"
  | "disabled_by_env"
  | "missing_api_key"
  | "coming_soon"
  | "unsupported_hidden"
  | "failed_smoke"
  | "disabled_in_catalog";

export type RecommendedUse = "discuss" | "planning" | "edit" | "heavy_build" | "avoid";

/** No live provider — hidden from normal users. */
export const HIDDEN_FROM_USER_IDS = new Set(["composer-latest"]);

/** Intentionally not wired (xAI stays coming soon). */
export const COMING_SOON_IDS = new Set(["grok-4"]);

/** Honest API alias notes for admin (not shown to normal users as routing internals). */
export const CATALOG_API_ALIASES: Record<string, { resolvesToApi: string; adminNote: string }> = {
  "gemini-3-1-pro": {
    resolvesToApi: "gemini-2.5-pro",
    adminNote: "Catalog label only — live API uses gemini-2.5-pro until Gemini 3.1 Pro is available",
  },
};

export type CatalogModelAvailability = {
  catalogModelId: string;
  name: string;
  provider: string;
  providerSlug: string;
  class: ModelAvailabilityClass;
  userVisible: boolean;
  userSelectable: boolean;
  apiModelId: string | null;
  catalogAliasNote: string | null;
  envDisableReason: string | null;
  smokeStatus: SmokeModelRow["status"] | null;
  smokeReason: string | null;
  lastSmokeCostUsd: number | null;
  lastSmokeLatencyMs: number | null;
  recommendedUse: RecommendedUse | null;
  adminNote: string | null;
  planTiers: string[];
  routingPriority: "cheap" | "standard" | "heavy" | "none";
};

function planTiersForModel(model: AIModel): string[] {
  if (model.comingSoon || HIDDEN_FROM_USER_IDS.has(model.id)) return [];
  if (model.quality === "ultra") return ["pro", "team", "enterprise"];
  if (model.quality === "premium") return ["starter", "pro", "team", "enterprise"];
  return ["free", "starter", "pro", "team", "enterprise"];
}

function routingPriorityForModel(model: AIModel): CatalogModelAvailability["routingPriority"] {
  if (HIDDEN_FROM_USER_IDS.has(model.id) || model.comingSoon) return "none";
  if (model.quality === "standard" && model.speed === "fast") return "cheap";
  if (model.quality === "ultra") return "heavy";
  return "standard";
}

function smokeRowForModel(
  modelId: string,
  smokeByModelId: Map<string, SmokeModelRow>,
): SmokeModelRow | null {
  return smokeByModelId.get(modelId) ?? null;
}

export function classifyCatalogModel(
  model: AIModel,
  smokeByModelId: Map<string, SmokeModelRow> = new Map(),
): CatalogModelAvailability {
  const smoke = smokeRowForModel(model.id, smokeByModelId);
  const alias = CATALOG_API_ALIASES[model.id];
  const apiModelId = model.id === "automatic" ? null : toApiModelId(model.id);
  const el = evaluateModelEligibility(model);

  let availabilityClass: ModelAvailabilityClass;
  let adminNote: string | null = el.eligible ? null : (el.adminNote ?? null);
  const skipReason = !el.eligible ? el.reason : null;

  if (HIDDEN_FROM_USER_IDS.has(model.id)) {
    availabilityClass = "unsupported_hidden";
    adminNote = adminNote ?? "No live provider endpoint — internal/unsupported";
  } else if (model.comingSoon || COMING_SOON_IDS.has(model.id)) {
    availabilityClass = "coming_soon";
    adminNote = adminNote ?? "Intentionally not wired yet";
  } else if (!model.available) {
    availabilityClass = "disabled_in_catalog";
  } else if (skipReason === "disabled_by_env") {
    availabilityClass = "disabled_by_env";
    adminNote = adminNote ?? "Unset env flag to enable provider smoke tests";
  } else if (skipReason === "missing_api_key") {
    availabilityClass = "missing_api_key";
  } else if (skipReason === "disabled_in_catalog") {
    availabilityClass = "disabled_in_catalog";
  } else if (smoke?.status === "failed") {
    availabilityClass = "failed_smoke";
    adminNote = smoke.reason ?? smoke.admin_note ?? adminNote;
  } else if (el.eligible && smoke?.status === "success") {
    availabilityClass = "available_now";
  } else if (el.eligible && !smoke) {
    availabilityClass = "available_now";
    adminNote = adminNote ?? "Eligible — run smoke:models-small to record latency/cost";
  } else if (el.eligible) {
    availabilityClass = "available_now";
  } else {
    availabilityClass = "disabled_in_catalog";
  }

  const userVisible =
    model.id === "automatic" ||
    (!HIDDEN_FROM_USER_IDS.has(model.id) &&
      (availabilityClass === "available_now" || availabilityClass === "coming_soon"));

  const userSelectable =
    model.id === "automatic" ||
    (availabilityClass === "available_now" && model.available && !model.comingSoon);

  return {
    catalogModelId: model.id,
    name: model.name,
    provider: model.provider,
    providerSlug: model.providerSlug,
    class: availabilityClass,
    userVisible,
    userSelectable,
    apiModelId,
    catalogAliasNote: alias?.adminNote ?? null,
    envDisableReason:
      availabilityClass === "disabled_by_env"
        ? getProviderStatus(
            model.providerSlug === "anthropic"
              ? "anthropic"
              : model.providerSlug === "openai"
                ? "openai"
                : model.providerSlug === "google"
                  ? "google"
                  : "unknown",
          ).disabledReason
        : null,
    smokeStatus: smoke?.status ?? null,
    smokeReason: smoke?.reason ?? smoke?.skip_or_error_reason ?? null,
    lastSmokeCostUsd: smoke?.provider_cost_usd ?? null,
    lastSmokeLatencyMs: smoke?.latency_ms ?? null,
    recommendedUse: smoke?.recommended_use ?? null,
    adminNote: alias?.adminNote ? `${alias.adminNote}${adminNote ? ` · ${adminNote}` : ""}` : adminNote,
    planTiers: planTiersForModel(model),
    routingPriority: routingPriorityForModel(model),
  };
}

export function buildCatalogAvailabilityReport(
  smokeRows: SmokeModelRow[] = [],
): CatalogModelAvailability[] {
  const smokeByModelId = new Map(smokeRows.map((r) => [r.catalog_model_id ?? r.model_id, r]));
  return aiModels.map((m) => classifyCatalogModel(m, smokeByModelId));
}

/** Models normal users may see in pickers (Automatic + available + coming soon labels). */
export function listUserVisibleCatalogModels(): AIModel[] {
  const smokeByModelId = new Map<string, SmokeModelRow>();
  return aiModels.filter((m) => classifyCatalogModel(m, smokeByModelId).userVisible);
}

/** Models normal users may select (working endpoints only). */
export function listUserSelectableCatalogModels(): AIModel[] {
  const smokeByModelId = new Map<string, SmokeModelRow>();
  return aiModels.filter((m) => classifyCatalogModel(m, smokeByModelId).userSelectable);
}

export function anthropicEnvDisableInstruction(): string | null {
  if (process.env.AI_PROVIDER_DISABLE_ANTHROPIC === "1") {
    return "Unset AI_PROVIDER_DISABLE_ANTHROPIC to enable Claude smoke tests.";
  }
  return null;
}

export function summarizeProviderSelectable(): Record<string, boolean> {
  return {
    anthropic: isProviderSelectable("anthropic"),
    openai: isProviderSelectable("openai"),
    google: isProviderSelectable("google"),
    xai: false,
  };
}

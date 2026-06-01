/**
 * Admin-only multi-model provider smoke test — tiny prompt, no user credits.
 */
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { aiModels, type AIModel } from "@/lib/data";
import {
  API_MODEL_MAP,
  toApiModelId,
  providerForCatalogId,
} from "@/lib/ai/model-catalog";
import {
  getProviderStatus,
  isProviderSelectable,
  recordProviderFailure,
  recordProviderSuccess,
} from "@/lib/ai/provider-availability";
import { classifyProviderError, providerFromModelId, type ProviderName } from "@/lib/ai/provider-errors";
import { calculateTokenProviderCostUsd } from "@/lib/credits/token-cost";
import type { PricingSource } from "@/lib/credits/model-pricing-map";
import {
  getSmokeProductSystemContext,
  scoreProductAwareDreamOSAnswer,
} from "@/lib/ai/smoke-product-context";
import { CHEAP_PLANNER_MODEL_ID } from "@/lib/ai/model-orchestration-policy";
import {
  classifyGeminiEmptyResponse,
  extractGenerateTextContent,
  googleSmokeMaxOutputTokens,
  withGoogleProviderOptions,
} from "@/lib/ai/gemini-generate-options";
import { isDeprecatedGeminiApiModel, probeGoogleModelAvailable } from "@/lib/ai/google-model-config";
import { googleGenerativeApiKey } from "@/lib/llm/env-keys";

export const SMOKE_PROMPT = "What is Vodex in one short sentence?";
export const SMOKE_MAX_OUTPUT = 40;
export const SMOKE_TEMPERATURE = 0.2;
export const SMOKE_TIMEOUT_MS = 20_000;
export const SMOKE_SPEND_CAP_USD = 0.05;
export const SMOKE_REPORT_FILENAME = ".dreamos-model-smoke-report.json";

export type SmokeRunMode = "raw_provider_smoke" | "product_aware_smoke";

/** Estimated input tokens for pre-run cost projection. */
const PROJECTED_INPUT_TOKENS_RAW = 48;
const PROJECTED_INPUT_TOKENS_PRODUCT = 380;

/** Deterministic heavy-model preference order (not chosen from one-sentence quality). */
const HEAVY_MODEL_ORDER = [
  "claude-opus-4-7",
  "claude-opus-4-6",
  "gpt-5-4",
  "gpt-5-5",
  "gemini-2-5-pro",
  "gemini-3-1-pro",
] as const;

/** Cheap models for planning/compression — never Sonnet from smoke quality alone. */
const CHEAP_PLANNER_ORDER = ["gpt-5-4-mini", "gemini-flash", "claude-haiku-4-5"] as const;

export type RecommendedUse = "discuss" | "planning" | "edit" | "heavy_build" | "avoid";

export type SmokeSkipReason =
  | "disabled_by_env"
  | "missing_api_key"
  | "provider_budget_exhausted"
  | "provider_unavailable"
  | "deprecated_model_mapping"
  | "disabled_in_catalog"
  | "over_spend_cap"
  | "unsupported_endpoint"
  | "model_mapping_required"
  | "empty_provider_response"
  | "response_parser_issue";

export type SmokeModelRow = {
  provider: string;
  catalog_model_id: string;
  /** @deprecated use catalog_model_id */
  model_id: string;
  api_model_id: string | null;
  app_mode_supported: string;
  status: "success" | "skipped" | "failed";
  reason: string | null;
  /** @deprecated use reason */
  skip_or_error_reason: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  provider_cost_usd: number | null;
  latency_ms: number | null;
  first_byte_ms: number | null;
  response_text: string | null;
  quality_note: string | null;
  recommended_use: RecommendedUse;
  admin_note: string | null;
  pricing_source: PricingSource | null;
  pricing_note: string | null;
  product_answer_correct: boolean | null;
};

export type ModelSmokeRun = {
  mode: SmokeRunMode;
  runAt: string;
  prompt: string;
  systemContextIncluded: boolean;
  limits: {
    maxOutputTokens: number;
    temperature: number;
    timeoutMs: number;
    spendCapUsd: number;
  };
  projectedCostUsd: number;
  totalProviderSpendUsd: number;
  testedCount: number;
  skippedCount: number;
  failedCount: number;
  rows: SmokeModelRow[];
};

export type CombinedModelSmokeReport = {
  updatedAt: string;
  rawProviderSmoke: ModelSmokeRun | null;
  productAwareSmoke: ModelSmokeRun | null;
  routingNotes: ModelSmokeRoutingNotes;
  userCreditsCharged: 0;
  confirmation: string;
};

export type ModelSmokeRoutingNotes = {
  cheapestReliableDiscuss: string | null;
  bestPlanning: string | null;
  bestHeavyImplementation: string | null;
  cheapestOverall: string | null;
  fastestOverall: string | null;
  bestEdit: string | null;
  fallbackWhenClaudeUnavailable: string | null;
  fallbackWhenOpenAiUnavailable: string | null;
  fallbackWhenGeminiUnavailable: string | null;
  unavailableProviders: string[];
  modelsToAvoid: Array<{ model_id: string; reason: string }>;
  optimizationEstimates: {
    discuss: string;
    planning: string;
    edit: string;
    build: string;
    summary: string;
    importedZipSupport: string;
    repairFlows: string;
  };
  updatedAt: string;
};

export type ModelSmokeReport = CombinedModelSmokeReport;

/** @deprecated single-run shape — use ModelSmokeRun inside CombinedModelSmokeReport */
export type LegacyModelSmokeReport = ModelSmokeRun & {
  routingNotes: ModelSmokeRoutingNotes;
  userCreditsCharged: 0;
  confirmation: string;
};

const UNWIRED_CATALOG_IDS = new Set(["composer-latest", "automatic"]);

function providerFromAiModel(model: AIModel): ProviderName {
  const slug = model.providerSlug;
  if (slug === "anthropic") return "anthropic";
  if (slug === "openai") return "openai";
  if (slug === "google") return "google";
  if (slug === "xai") return "xai";
  return providerFromModelId(model.id);
}

function isCatalogModelWired(modelId: string): boolean {
  if (UNWIRED_CATALOG_IDS.has(modelId)) return false;
  if (modelId in API_MODEL_MAP) return true;
  const p = providerForCatalogId(modelId);
  return p !== "none";
}

export function appModesForModel(model: AIModel): string {
  const modes: string[] = ["discuss"];
  if (model.quality !== "standard") modes.push("edit");
  if (model.quality === "premium" || model.quality === "ultra") modes.push("planning");
  if (model.quality === "ultra") modes.push("heavy_build");
  return modes.join(", ");
}

export type ModelEligibility =
  | { eligible: true; provider: ProviderName; apiModelId: string; adminNote?: string }
  | { eligible: false; provider: ProviderName; reason: SmokeSkipReason | string; adminNote?: string };

export function evaluateModelEligibility(model: AIModel): ModelEligibility {
  const provider = providerFromAiModel(model);

  if (!model.available || model.comingSoon) {
    return { eligible: false, provider, reason: "disabled_in_catalog" };
  }
  if (!isCatalogModelWired(model.id)) {
    return {
      eligible: false,
      provider,
      reason: "disabled_in_catalog",
      adminNote: `${model.id} is not wired to a live provider endpoint`,
    };
  }

  if (provider === "anthropic" && process.env.AI_PROVIDER_DISABLE_ANTHROPIC === "1") {
    return {
      eligible: false,
      provider,
      reason: "disabled_by_env",
      adminNote: "AI_PROVIDER_DISABLE_ANTHROPIC=1 — Anthropic intentionally disabled",
    };
  }

  const status = getProviderStatus(provider);
  if (!status.configured) {
    return { eligible: false, provider, reason: "missing_api_key" };
  }
  if (status.disabled) {
    return { eligible: false, provider, reason: "disabled_by_env" };
  }
  if (status.status === "coming_soon") {
    return { eligible: false, provider, reason: "disabled_in_catalog" };
  }
  if (status.status === "quota_exhausted" || status.status === "auth_error") {
    return { eligible: false, provider, reason: "provider_budget_exhausted" };
  }
  if (!isProviderSelectable(provider)) {
    return { eligible: false, provider, reason: "provider_unavailable" };
  }

  const apiModelId = toApiModelId(model.id);
  if (providerForCatalogId(model.id) === "none" && provider === "xai") {
    return { eligible: false, provider, reason: "disabled_in_catalog" };
  }

  if (provider === "google" && isDeprecatedGeminiApiModel(apiModelId)) {
    return {
      eligible: false,
      provider,
      reason: "deprecated_model_mapping",
      adminNote: `Catalog maps to deprecated ${apiModelId}. Set GOOGLE_GEMINI_FLASH_MODEL / GOOGLE_GEMINI_PRO_MODEL`,
    };
  }

  return { eligible: true, provider, apiModelId };
}

export function listSmokeCatalogModels(): AIModel[] {
  return aiModels.filter((m) => m.id !== "automatic");
}

export function projectSmokeCostUsd(models: AIModel[], mode: SmokeRunMode = "raw_provider_smoke"): number {
  const inputTokens =
    mode === "product_aware_smoke" ? PROJECTED_INPUT_TOKENS_PRODUCT : PROJECTED_INPUT_TOKENS_RAW;
  let total = 0;
  for (const model of models) {
    const el = evaluateModelEligibility(model);
    if (!el.eligible) continue;
    total += calculateTokenProviderCostUsd(model.id, inputTokens, SMOKE_MAX_OUTPUT).costUsd;
  }
  return Math.round(total * 1_000_000) / 1_000_000;
}

function resolveLanguageModel(apiModelId: string) {
  if (apiModelId.startsWith("gemini")) {
    const key = googleGenerativeApiKey();
    if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not configured");
    return createGoogleGenerativeAI({ apiKey: key })(apiModelId);
  }
  if (apiModelId.startsWith("claude")) {
    if (!process.env.ANTHROPIC_API_KEY?.trim()) throw new Error("ANTHROPIC_API_KEY not configured");
    return anthropic(apiModelId);
  }
  if (apiModelId.startsWith("gpt")) {
    if (!process.env.OPENAI_API_KEY?.trim()) throw new Error("OPENAI_API_KEY not configured");
    return openai(apiModelId);
  }
  throw new Error(`Unsupported API model: ${apiModelId}`);
}

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const withData = err as { data?: { error?: { message?: string } }; message?: string };
    const apiMsg = withData.data?.error?.message;
    if (apiMsg) return apiMsg;
    if (withData.message) return withData.message;
  }
  return err instanceof Error ? err.message : String(err);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function scoreResponseQuality(text: string | null): { score: number; note: string } {
  if (!text?.trim()) return { score: 0, note: "empty response" };
  const t = text.trim();
  const lower = t.toLowerCase();
  let score = 2;
  const notes: string[] = [];

  if (t.length >= 20 && t.length <= 280) {
    score += 1;
    notes.push("concise length");
  } else if (t.length > 280) {
    notes.push("verbose for one sentence");
  } else {
    notes.push("very short");
  }

  if (/dreamos/i.test(t)) {
    score += 1;
    notes.push("mentions DreamOS");
  } else {
    notes.push("missing DreamOS reference");
  }

  if (/platform|build|app|ai|create/i.test(lower)) {
    score += 0.5;
    notes.push("relevant product context");
  }

  if (/error|cannot|don't know|unsure/i.test(lower)) {
    score -= 1;
    notes.push("uncertain tone");
  }

  return { score: Math.max(0, Math.min(5, score)), note: notes.join("; ") };
}

function inferRecommendedUse(
  row: Pick<SmokeModelRow, "status" | "provider_cost_usd" | "latency_ms" | "response_text">,
  model: AIModel,
): RecommendedUse {
  if (row.status !== "success") return "avoid";
  const cost = row.provider_cost_usd ?? 999;
  const latency = row.latency_ms ?? 99_999;
  const { score } = scoreResponseQuality(row.response_text);

  if (cost > 0.004 || latency > 18_000 || score < 1.5) return "avoid";
  if (model.quality === "ultra" && score >= 3.5) return "heavy_build";
  if ((model.quality === "ultra" || model.quality === "premium") && score >= 3) return "planning";
  if (cost <= 0.0004 && latency <= 10_000 && score >= 2) return "discuss";
  if (score >= 2.5) return "edit";
  return "discuss";
}

async function callModelOnce(
  model: AIModel,
  apiModelId: string,
  mode: SmokeRunMode,
): Promise<Omit<SmokeModelRow, "catalog_model_id" | "model_id" | "app_mode_supported" | "recommended_use">> {
  const provider = providerFromAiModel(model);
  const started = performance.now();
  const systemContext = mode === "product_aware_smoke" ? getSmokeProductSystemContext() : undefined;

  const run = async () => {
    const llm = resolveLanguageModel(apiModelId);
    const maxOutput = googleSmokeMaxOutputTokens(apiModelId, SMOKE_MAX_OUTPUT);
    const result = await generateText(
      withGoogleProviderOptions(apiModelId, {
        model: llm,
        ...(systemContext ? { system: systemContext } : {}),
        prompt: SMOKE_PROMPT,
        maxOutputTokens: maxOutput,
        temperature: SMOKE_TEMPERATURE,
      }),
    );

    const text = extractGenerateTextContent(result);
    const inputTokens = result.usage?.inputTokens ?? null;
    const outputTokens = result.usage?.outputTokens ?? null;
    const latencyMs = Math.round(performance.now() - started);

    if (!text.trim()) {
      const classified = classifyGeminiEmptyResponse({
        apiModelId,
        finishReason: result.finishReason,
        usage: result.usage,
        rawText: result.text ?? "",
      });
      throw new Error(`${classified.kind}: ${classified.detail}`);
    }

    const costCalc =
      inputTokens != null && outputTokens != null
        ? calculateTokenProviderCostUsd(model.id, inputTokens, outputTokens)
        : null;

    recordProviderSuccess(provider);

    const quality = scoreResponseQuality(text.trim());
    const productScore =
      mode === "product_aware_smoke" ? scoreProductAwareDreamOSAnswer(text.trim()) : null;

    return {
      provider,
      api_model_id: apiModelId,
      status: "success" as const,
      reason: null,
      skip_or_error_reason: null,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens:
        inputTokens != null && outputTokens != null ? inputTokens + outputTokens : null,
      provider_cost_usd: costCalc?.costUsd ?? null,
      latency_ms: latencyMs,
      first_byte_ms: null,
      response_text: text.trim(),
      quality_note:
        mode === "product_aware_smoke" && productScore
          ? `${quality.note}; ${productScore.note}`
          : quality.note,
      admin_note: null,
      pricing_source: costCalc?.pricingSource ?? null,
      pricing_note: costCalc?.pricingNote ?? null,
      product_answer_correct: productScore?.correct ?? null,
    };
  };

  try {
    return await withTimeout(run(), SMOKE_TIMEOUT_MS, apiModelId);
  } catch (err) {
    const classified = classifyProviderError(err);
    recordProviderFailure(classified.provider, classified.errorClass);
    const msg = extractErrorMessage(err).slice(0, 200);
    const reason =
      /empty_provider_response/i.test(msg)
        ? "empty_provider_response"
        : /response_parser_issue/i.test(msg)
          ? "response_parser_issue"
          : /no longer available|deprecated|model_not_found/i.test(msg)
            ? "deprecated_model_mapping"
            : classified.errorClass === "quota_exhausted"
              ? "provider_budget_exhausted"
              : "provider_unavailable";
    return {
      provider,
      api_model_id: apiModelId,
      status: "failed",
      reason: msg,
      skip_or_error_reason: msg,
      input_tokens: null,
      output_tokens: null,
      total_tokens: null,
      provider_cost_usd: null,
      latency_ms: Math.round(performance.now() - started),
      first_byte_ms: null,
      response_text: null,
      quality_note: null,
      admin_note: reason,
      pricing_source: null,
      pricing_note: null,
      product_answer_correct: null,
    };
  }
}

function skipRow(
  model: AIModel,
  el: Extract<ModelEligibility, { eligible: false }>,
): SmokeModelRow {
  const apiModelId = model.id in API_MODEL_MAP ? toApiModelId(model.id) : null;
  return {
    provider: el.provider,
    catalog_model_id: model.id,
    model_id: model.id,
    api_model_id: apiModelId,
    app_mode_supported: appModesForModel(model),
    status: "skipped",
    reason: el.reason,
    skip_or_error_reason: el.reason,
    input_tokens: null,
    output_tokens: null,
    total_tokens: null,
    provider_cost_usd: null,
    latency_ms: null,
    first_byte_ms: null,
    response_text: null,
    quality_note: null,
    recommended_use: "avoid",
    admin_note: el.adminNote ?? null,
    pricing_source: null,
    pricing_note: null,
    product_answer_correct: null,
  };
}

function productCorrectById(rows: SmokeModelRow[], modelId: string): boolean {
  const row = rows.find((r) => r.catalog_model_id === modelId && r.status === "success");
  return row?.product_answer_correct === true;
}

function pickFirstAvailable(
  order: readonly string[],
  productRows: SmokeModelRow[],
  rawRows: SmokeModelRow[],
  requireProductPass = false,
): string | null {
  for (const id of order) {
    const raw = rawRows.find((r) => r.catalog_model_id === id);
    if (raw && raw.status === "skipped") continue;
    if (raw && raw.status === "failed") continue;
    if (requireProductPass && !productCorrectById(productRows, id)) continue;
    if (raw?.status === "success" || productCorrectById(productRows, id)) return id;
  }
  return null;
}

export function buildRoutingNotes(
  rawRows: SmokeModelRow[],
  productRows: SmokeModelRow[],
  modelsById: Map<string, AIModel>,
): ModelSmokeRoutingNotes {
  const rawSuccesses = rawRows.filter((r) => r.status === "success");
  const productSuccesses = productRows.filter((r) => r.status === "success");
  const productCorrect = productSuccesses.filter((r) => r.product_answer_correct === true);
  const allRows = [...rawRows, ...productRows];
  const unavailableProviders = [
    ...new Set([
      ...allRows
        .filter(
          (r) =>
            r.status === "skipped" &&
            (r.reason === "provider_budget_exhausted" || r.reason === "disabled_by_env"),
        )
        .map((r) => r.provider),
      ...(["anthropic", "openai", "google", "xai"] as const).filter((p) => {
        const providerRows = rawRows.filter((r) => r.provider === p);
        if (providerRows.length === 0) return false;
        const tested = providerRows.filter((r) => r.status === "success" || r.status === "failed");
        return tested.length > 0 && tested.every((r) => r.status === "failed");
      }),
    ]),
  ];

  const discussCandidates = productCorrect
    .filter((r) => {
      const m = modelsById.get(r.catalog_model_id);
      return m && (m.quality === "standard" || r.provider_cost_usd != null);
    })
    .sort((a, b) => (a.provider_cost_usd ?? 999) - (b.provider_cost_usd ?? 999));

  const cheapestOverall = [...rawSuccesses].sort(
    (a, b) => (a.provider_cost_usd ?? 999) - (b.provider_cost_usd ?? 999),
  )[0]?.catalog_model_id ?? null;

  const fastestOverall = [...rawSuccesses].sort(
    (a, b) => (a.latency_ms ?? 99_999) - (b.latency_ms ?? 99_999),
  )[0]?.catalog_model_id ?? null;

  const bestPlanning =
    pickFirstAvailable(CHEAP_PLANNER_ORDER, productRows, rawRows, true) ??
    pickFirstAvailable(CHEAP_PLANNER_ORDER, productRows, rawRows, false) ??
    CHEAP_PLANNER_MODEL_ID;

  const bestHeavyImplementation =
    pickFirstAvailable(HEAVY_MODEL_ORDER, productRows, rawRows, true) ??
    pickFirstAvailable(HEAVY_MODEL_ORDER, productRows, rawRows, false) ??
    "claude-opus-4-7";

  const editCandidates = productCorrect
    .filter((r) => (r.provider_cost_usd ?? 999) <= 0.001)
    .sort((a, b) => (a.provider_cost_usd ?? 999) - (b.provider_cost_usd ?? 999));

  const modelsToAvoid = [
    ...productSuccesses
      .filter((r) => r.product_answer_correct === false)
      .map((r) => ({
        model_id: r.catalog_model_id,
        reason: `failed product-aware smoke (${r.quality_note ?? "wrong product answer"})`,
      })),
    ...allRows
      .filter((r) => r.status === "failed")
      .map((r) => ({
        model_id: r.catalog_model_id,
        reason: r.reason ?? "request failed",
      })),
  ];

  const bestAnthropicHeavy = rawSuccesses.find((r) => r.catalog_model_id === bestHeavyImplementation);
  const bestOpenAiHeavy = rawSuccesses.find((r) =>
    ["gpt-5-4", "gpt-5-5"].includes(r.catalog_model_id),
  );
  const bestGoogleHeavy = rawSuccesses.find((r) =>
    ["gemini-2-5-pro", "gemini-3-1-pro"].includes(r.catalog_model_id),
  );

  return {
    cheapestReliableDiscuss:
      discussCandidates[0]?.catalog_model_id ??
      pickFirstAvailable(CHEAP_PLANNER_ORDER, productRows, rawRows, false),
    bestPlanning,
    bestHeavyImplementation,
    cheapestOverall,
    fastestOverall,
    bestEdit:
      editCandidates[0]?.catalog_model_id ??
      discussCandidates[0]?.catalog_model_id ??
      "gemini-flash",
    fallbackWhenClaudeUnavailable:
      bestOpenAiHeavy?.catalog_model_id ?? bestGoogleHeavy?.catalog_model_id ?? "gpt-5-4",
    fallbackWhenOpenAiUnavailable:
      bestAnthropicHeavy?.catalog_model_id ?? bestGoogleHeavy?.catalog_model_id ?? "claude-opus-4-7",
    fallbackWhenGeminiUnavailable:
      bestOpenAiHeavy?.catalog_model_id ??
      bestAnthropicHeavy?.catalog_model_id ??
      "gpt-5-4-mini",
    unavailableProviders,
    modelsToAvoid,
    optimizationEstimates: {
      discuss: "70–95% cheaper vs single heavy model (mini/flash vs Opus/Sonnet) with product-aware routing",
      planning: "30–70% cheaper — cheap planner compresses before heavy build (never Sonnet-for-planning default)",
      edit: "40–80% cheaper for small edits using mini/flash; heavy only when complexity ≥7",
      build: "15–40% better cost/quality — heavy model receives compressed product-aware prompt",
      summary: "70–95% cheaper when mini/flash summarizes instead of heavy model",
      importedZipSupport: "30–60% cheaper — deterministic validators + cheap planner for intake",
      repairFlows: "25–50% cheaper — cheap triage then targeted heavy repair only if needed",
    },
    updatedAt: new Date().toISOString(),
  };
}

export type RunModelSmokeOptions = {
  mode?: SmokeRunMode;
  /** Abort when projected spend exceeds cap unless true. */
  approveOverBudget?: boolean;
  /** Combined spend from prior mode in same session (for dual-run cap). */
  priorSpendUsd?: number;
  onProgress?: (event: { modelId: string; index: number; total: number; mode: SmokeRunMode }) => void;
};

export async function runModelSmokeTest(options: RunModelSmokeOptions = {}): Promise<ModelSmokeRun> {
  const mode = options.mode ?? "raw_provider_smoke";
  const catalog = listSmokeCatalogModels();
  const projectedCostUsd = projectSmokeCostUsd(catalog, mode);
  const priorSpend = options.priorSpendUsd ?? 0;

  if (projectedCostUsd + priorSpend > SMOKE_SPEND_CAP_USD && !options.approveOverBudget) {
    throw new Error(
      `Projected provider spend $${(projectedCostUsd + priorSpend).toFixed(4)} exceeds cap $${SMOKE_SPEND_CAP_USD.toFixed(2)}. ` +
        "Re-run with --approve-over-budget or DREAMOS_MODEL_SMOKE_APPROVED=1 if intentional.",
    );
  }

  const modelsById = new Map(catalog.map((m) => [m.id, m]));
  const rows: SmokeModelRow[] = [];
  const toTest = catalog.filter((m) => evaluateModelEligibility(m).eligible);
  let totalProviderSpendUsd = priorSpend;

  for (let i = 0; i < catalog.length; i++) {
    const model = catalog[i]!;
    const el = evaluateModelEligibility(model);

    if (!el.eligible) {
      rows.push(skipRow(model, el));
      continue;
    }

    if (el.provider === "google") {
      const probe = await probeGoogleModelAvailable(el.apiModelId);
      if (!probe.ok) {
        rows.push({
          ...skipRow(model, {
            eligible: false,
            provider: el.provider,
            reason: probe.reason ?? "model_mapping_required",
            adminNote: probe.adminNote,
          }),
          api_model_id: el.apiModelId,
        });
        continue;
      }
    }

    options.onProgress?.({ modelId: model.id, index: i + 1, total: catalog.length, mode });

    const result = await callModelOnce(model, el.apiModelId, mode);
    if (result.provider_cost_usd != null) totalProviderSpendUsd += result.provider_cost_usd;

    const row: SmokeModelRow = {
      catalog_model_id: model.id,
      model_id: model.id,
      app_mode_supported: appModesForModel(model),
      recommended_use: "discuss",
      ...result,
    };
    row.recommended_use = inferRecommendedUse(row, model);
    rows.push(row);

    if (totalProviderSpendUsd > SMOKE_SPEND_CAP_USD) {
      throw new Error(
        `Actual spend $${totalProviderSpendUsd.toFixed(4)} exceeded cap $${SMOKE_SPEND_CAP_USD.toFixed(2)} mid-run.`,
      );
    }
  }

  return {
    mode,
    runAt: new Date().toISOString(),
    prompt: SMOKE_PROMPT,
    systemContextIncluded: mode === "product_aware_smoke",
    limits: {
      maxOutputTokens: SMOKE_MAX_OUTPUT,
      temperature: SMOKE_TEMPERATURE,
      timeoutMs: SMOKE_TIMEOUT_MS,
      spendCapUsd: SMOKE_SPEND_CAP_USD,
    },
    projectedCostUsd,
    totalProviderSpendUsd: Math.round((totalProviderSpendUsd - priorSpend) * 1_000_000) / 1_000_000,
    testedCount: toTest.length,
    skippedCount: rows.filter((r) => r.status === "skipped").length,
    failedCount: rows.filter((r) => r.status === "failed").length,
    rows,
  };
}

export function mergeSmokeRuns(
  raw: ModelSmokeRun | null,
  product: ModelSmokeRun | null,
  modelsById: Map<string, AIModel>,
): CombinedModelSmokeReport {
  const rawRows = raw?.rows ?? [];
  const productRows = product?.rows ?? [];
  return {
    updatedAt: new Date().toISOString(),
    rawProviderSmoke: raw,
    productAwareSmoke: product,
    routingNotes: buildRoutingNotes(rawRows, productRows, modelsById),
    userCreditsCharged: 0,
    confirmation: "No charge_tokens or user credit_events were invoked — admin provider smoke only.",
  };
}

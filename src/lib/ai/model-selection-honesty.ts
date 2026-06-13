import { isProviderSelectable } from "@/lib/ai/provider-availability";
import {
  getHonestModelDisplayName,
  providerForCatalogId,
  toApiModelId,
} from "@/lib/ai/model-catalog";
import { CATALOG_API_ALIASES } from "@/lib/ai/model-catalog-availability";
import { probeGoogleModelAvailable } from "@/lib/ai/google-model-config";
import { isAutomaticModelId } from "@/lib/ai/resolve-automatic-model";
import { CREATION_MODELS } from "@/lib/creation/models";
import { BUILD_UI_EXCLUDED_MODEL_IDS } from "@/lib/creation/model-ratings";
import {
  isModelAffordableForBuild,
  minBuildCreditsForModel,
} from "@/lib/creation/model-credit-availability";

export type BuildModelValidation = {
  ok: boolean;
  selectedModel: string;
  modelUsed: string;
  honestDisplayName: string;
  apiModelId: string;
  provider: ReturnType<typeof providerForCatalogId>;
  fallbackReason: string | null;
  error?: string;
  code?: string;
};

function displayNameForCatalog(catalogId: string): string {
  return CREATION_MODELS.find((m) => m.id === catalogId)?.name ?? catalogId;
}

/** Validate user-selected build model — never silently substitute another catalog model. */
export async function validateBuildModelSelection(input: {
  modelId: string | null | undefined;
  buildCreditsAvailable: number;
}): Promise<BuildModelValidation> {
  const selected = input.modelId?.trim() || "automatic";

  if (isAutomaticModelId(selected)) {
    return {
      ok: true,
      selectedModel: "automatic",
      modelUsed: "automatic",
      honestDisplayName: "Automatic",
      apiModelId: "automatic",
      provider: "none",
      fallbackReason: null,
    };
  }

  const catalog = CREATION_MODELS.find((m) => m.id === selected);
  if (!catalog) {
    return {
      ok: false,
      selectedModel: selected,
      modelUsed: selected,
      honestDisplayName: selected,
      apiModelId: selected,
      provider: "none",
      fallbackReason: null,
      error: `Unknown model "${selected}". Choose another model.`,
      code: "model_not_found",
    };
  }

  if (BUILD_UI_EXCLUDED_MODEL_IDS.has(selected)) {
    return {
      ok: false,
      selectedModel: selected,
      modelUsed: selected,
      honestDisplayName: catalog.name,
      apiModelId: toApiModelId(selected),
      provider: providerForCatalogId(selected),
      fallbackReason: null,
      error: `${catalog.name} cannot generate full app UIs. Choose Automatic, Gemini 3.1 Pro, GPT-5.4, or Claude Sonnet.`,
      code: "model_ui_not_capable",
    };
  }

  const provider = providerForCatalogId(selected);
  if (provider !== "none" && !isProviderSelectable(provider)) {
    const reason =
      provider === "google"
        ? "Google API key missing or provider disabled"
        : provider === "openai"
          ? "OpenAI API key missing or provider disabled"
          : provider === "anthropic"
            ? "Anthropic API key missing or provider disabled"
            : "Provider unavailable";
    return {
      ok: false,
      selectedModel: selected,
      modelUsed: selected,
      honestDisplayName: catalog.name,
      apiModelId: toApiModelId(selected),
      provider,
      fallbackReason: null,
      error: `${catalog.name} is unavailable: ${reason}. Choose another model.`,
      code: "model_provider_unavailable",
    };
  }

  if (input.buildCreditsAvailable <= 0) {
    return {
      ok: false,
      selectedModel: selected,
      modelUsed: selected,
      honestDisplayName: catalog.name,
      apiModelId: toApiModelId(selected),
      provider,
      fallbackReason: null,
      error: `${catalog.name} is unavailable: out of build credits. Add credits or choose Automatic.`,
      code: "blocked_zero_credits",
    };
  }

  if (!isModelAffordableForBuild(catalog, input.buildCreditsAvailable)) {
    const min = minBuildCreditsForModel(catalog);
    return {
      ok: false,
      selectedModel: selected,
      modelUsed: selected,
      honestDisplayName: catalog.name,
      apiModelId: toApiModelId(selected),
      provider,
      fallbackReason: null,
      error: `${catalog.name} is unavailable: need ~${min} build credits (you have ${Math.floor(input.buildCreditsAvailable)}). Choose a cheaper model or Automatic.`,
      code: "insufficient_tokens",
    };
  }

  const apiModelId = toApiModelId(selected);
  if (provider === "google") {
    const probe = await probeGoogleModelAvailable(apiModelId);
    if (!probe.ok) {
      return {
        ok: false,
        selectedModel: selected,
        modelUsed: selected,
        honestDisplayName: catalog.name,
        apiModelId,
        provider,
        fallbackReason: null,
        error: `${catalog.name} is unavailable: ${probe.adminNote ?? probe.reason ?? "Google model unreachable"}. Choose another model.`,
        code: "model_api_unavailable",
      };
    }
  }

  const alias = CATALOG_API_ALIASES[selected];
  const honestDisplayName = getHonestModelDisplayName(selected);
  const fallbackReason =
    alias && honestDisplayName !== catalog.name ? "catalog_api_alias" : null;

  return {
    ok: true,
    selectedModel: selected,
    modelUsed: selected,
    honestDisplayName,
    apiModelId,
    provider,
    fallbackReason,
  };
}

export function buildModelHonestyLogFields(validation: BuildModelValidation): Record<string, string | null> {
  return {
    selected_model: validation.selectedModel,
    model_used: validation.honestDisplayName,
    catalog_model_id: validation.selectedModel,
    api_model_id: validation.apiModelId,
    fallback_reason: validation.fallbackReason,
  };
}

export function userFacingModelHonestyLine(validation: BuildModelValidation): string | null {
  if (!validation.fallbackReason || validation.honestDisplayName === displayNameForCatalog(validation.selectedModel)) {
    return null;
  }
  return `Using ${validation.honestDisplayName} for this build (selected ${displayNameForCatalog(validation.selectedModel)}).`;
}

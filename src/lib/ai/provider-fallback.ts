import type { ProviderName } from "@/lib/ai/provider-errors";
import {
  classifyProviderError,
  pickFailoverCatalogModel,
  providerFromModelId,
  userFacingProviderMessage,
} from "@/lib/ai/provider-errors";
import { isProviderSelectable } from "@/lib/ai/provider-availability";
import { discussDefaultProvider } from "@/lib/ai/provider-health";

export type FallbackResolution = {
  modelId: string;
  provider: ProviderName;
  isFallback: boolean;
  reason: string;
};

/** Discuss mode prefers OpenAI when available (cost + reliability when Anthropic quota exhausted). */
export function resolveDiscussModel(requestedModelId?: string | null): FallbackResolution {
  const preferred =
    requestedModelId && requestedModelId !== "automatic"
      ? requestedModelId
      : discussDefaultProvider() === "openai"
        ? "gpt-5-4-mini"
        : discussDefaultProvider() === "google"
          ? "gemini-flash"
          : "claude-haiku-4-5";

  const primary = providerFromModelId(preferred);
  if (isProviderSelectable(primary)) {
    return { modelId: preferred, provider: primary, isFallback: false, reason: "primary_selectable" };
  }

  const altId = pickFailoverCatalogModel(primary, "discuss_stream");
  if (altId) {
    return {
      modelId: altId,
      provider: providerFromModelId(altId),
      isFallback: true,
      reason: `failover_from_${primary}`,
    };
  }

  return { modelId: preferred, provider: primary, isFallback: false, reason: "no_alternative" };
}

/** Pick a model for an operation, skipping exhausted providers. */
export function resolveModelWithFallback(
  modelId: string,
  operationType: string,
): FallbackResolution {
  const primary = providerFromModelId(modelId);
  if (isProviderSelectable(primary)) {
    return { modelId, provider: primary, isFallback: false, reason: "primary_selectable" };
  }
  const altId = pickFailoverCatalogModel(primary, operationType);
  if (altId) {
    return {
      modelId: altId,
      provider: providerFromModelId(altId),
      isFallback: true,
      reason: `failover_from_${primary}`,
    };
  }
  return { modelId, provider: primary, isFallback: false, reason: "no_alternative" };
}

export function userSafeAiUnavailableMessage(): string {
  return "AI is temporarily unavailable. Please try again shortly.";
}

export {
  classifyProviderError,
  pickFailoverCatalogModel,
  providerFromModelId,
  userFacingProviderMessage,
};

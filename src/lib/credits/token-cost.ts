/** Per-token provider cost estimates (USD) for budget guards. */
import { calculateTokenProviderCostUsd } from "@/lib/credits/model-pricing-map";

export function estimateTokenProviderCostUsd(
  catalogOrApiModelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  return calculateTokenProviderCostUsd(catalogOrApiModelId, inputTokens, outputTokens).costUsd;
}

export { calculateTokenProviderCostUsd, resolveModelPricing, MODEL_PRICING_MAP } from "@/lib/credits/model-pricing-map";

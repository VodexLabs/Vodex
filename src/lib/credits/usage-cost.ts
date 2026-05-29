/**
 * Provider cost estimates (USD) from per-model $/1M input/output rates.
 * User credits: provider_usd × TARGET_REVENUE_MULTIPLIER × USER_CREDITS_PER_USD (see pricing-config).
 */

import { estimateTokenProviderCostUsd } from "@/lib/credits/token-cost";

/** Typical token envelope when usage is not known yet. */
export function defaultTokenEnvelopeForMode(mode: string): { input: number; output: number } {
  if (mode === "discuss") return { input: 2000, output: 800 };
  if (mode === "edit") return { input: 3000, output: 2000 };
  if (mode === "build") return { input: 4000, output: 12000 };
  return { input: 2000, output: 4000 };
}

export function estimateProviderCostUsd(
  modelId: string,
  mode: string,
  tokensInput?: number | null,
  tokensOutput?: number | null,
): number {
  const defaults = defaultTokenEnvelopeForMode(mode);
  const inTok = tokensInput ?? defaults.input;
  const outTok = tokensOutput ?? defaults.output;
  return estimateTokenProviderCostUsd(modelId, inTok, outTok);
}

export function estimateOwnerRevenueUsd(creditsCharged: number): number {
  return creditsCharged / 50;
}

export function estimateOwnerMarginUsd(
  creditsCharged: number,
  providerCostUsd: number,
): number {
  return estimateOwnerRevenueUsd(creditsCharged) - providerCostUsd;
}

import { estimateProviderCostUsd } from "@/lib/credits/usage-cost";
import { estimateTokenProviderCostUsd } from "@/lib/credits/token-cost";
import {
  TARGET_REVENUE_MULTIPLIER,
  USER_CREDITS_PER_USD,
  minimumUserCreditsForProviderCost,
} from "@/lib/billing/pricing-config";

import {
  quoteGenerationCost,
  creditsFromProviderCostUsd,
  quoteDiscussCost,
  quoteCreateQuestionCost,
} from "@/lib/billing/credit-profit-guard";

/** @deprecated Use TARGET_REVENUE_MULTIPLIER */
export const DREAMOS_CREDIT_MARKUP = TARGET_REVENUE_MULTIPLIER;

export const CREDIT_UNIT_VALUE_USD = 1 / USER_CREDITS_PER_USD;

export type CreditEstimateInput = {
  mode: "discuss" | "edit" | "build";
  modelId: string;
  provider?: string;
  promptLength?: number;
  expectedFiles?: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
};

export type CreditEstimateResult = {
  creditsMin: number;
  creditsMax: number;
  estimatedProviderCostUsd: number;
};

export function estimateCreditsForOperation(input: CreditEstimateInput): CreditEstimateResult {
  const providerCost = estimateProviderCostUsd(
    input.modelId,
    input.mode,
    input.inputTokens ?? null,
    input.outputTokens ?? null,
  );
  const quote = quoteGenerationCost({
    mode: input.mode === "build" ? "build" : input.mode,
    selectedModel: input.modelId,
    estimatedProviderCostUsd: providerCost,
    promptLength: input.promptLength,
    expectedFiles: input.expectedFiles,
  });

  return {
    creditsMin: quote.userCreditsRequired,
    creditsMax: quote.userCreditsReserved,
    estimatedProviderCostUsd: providerCost,
  };
}

export function calculateCreditsForStagedBuild(input: {
  providerCostUsd: number;
  complexity: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  primaryModelId: string;
  fileCount?: number;
}): ChargeCalculationResult {
  const tokenCost =
    input.inputTokens != null && input.outputTokens != null
      ? estimateTokenProviderCostUsd(input.primaryModelId, input.inputTokens, input.outputTokens)
      : input.providerCostUsd;

  const providerUsd = Math.max(tokenCost, input.providerCostUsd);
  const creditsToCharge = normalizeCreditCharge(minimumUserCreditsForProviderCost(providerUsd));

  return {
    creditsToCharge,
    estimatedProviderCostUsd: providerUsd,
    marginMultiplier: TARGET_REVENUE_MULTIPLIER,
  };
}

export function normalizeCreditCharge(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0.1) return 0.1;
  return Math.ceil(amount * 10) / 10;
}

export type ChargeCalculationInput = {
  modelId: string;
  mode: "discuss" | "create_question" | "edit" | "build";
  inputTokens?: number | null;
  outputTokens?: number | null;
  fileCount?: number;
};

export type ChargeCalculationResult = {
  creditsToCharge: number;
  estimatedProviderCostUsd: number;
  marginMultiplier: number;
};

export function creditsFromProviderCost(providerCostUsd: number): number {
  return creditsFromProviderCostUsd(providerCostUsd);
}

export function calculateCreditsToCharge(input: ChargeCalculationInput): ChargeCalculationResult {
  const tokenCost =
    input.inputTokens != null && input.outputTokens != null
      ? estimateTokenProviderCostUsd(input.modelId, input.inputTokens, input.outputTokens)
      : estimateProviderCostUsd(input.modelId, input.mode === "build" ? "build" : "discuss", input.inputTokens, input.outputTokens);

  if (input.mode === "discuss") {
    const quote = quoteDiscussCost({
      selectedModel: input.modelId,
      estimatedProviderCostUsd: tokenCost,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
    });
    return {
      creditsToCharge: normalizeCreditCharge(quote.userCreditsRequired),
      estimatedProviderCostUsd: tokenCost,
      marginMultiplier: quote.revenueMultiplier,
    };
  }

  if (input.mode === "create_question") {
    const quote = quoteCreateQuestionCost({
      selectedModel: input.modelId,
      estimatedProviderCostUsd: tokenCost,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
    });
    return {
      creditsToCharge: normalizeCreditCharge(quote.userCreditsRequired),
      estimatedProviderCostUsd: tokenCost,
      marginMultiplier: quote.revenueMultiplier,
    };
  }

  const providerUsd = tokenCost;
  const creditsToCharge = normalizeCreditCharge(minimumUserCreditsForProviderCost(providerUsd));

  return {
    creditsToCharge,
    estimatedProviderCostUsd: providerUsd,
    marginMultiplier: TARGET_REVENUE_MULTIPLIER,
  };
}

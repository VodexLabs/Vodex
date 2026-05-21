import { calculateCredits, CREDITS_PER_USD } from "@/lib/credits/cost-engine";
import { estimateProviderCostUsd } from "@/lib/credits/usage-cost";
import { estimateTokenProviderCostUsd } from "@/lib/credits/token-cost";
import type { AiOperationType } from "@/lib/ai/operation-types";

/** User-facing markup: dreamos_charge = provider_cost × 3.5 */
export const DREAMOS_CREDIT_MARKUP = 3.5;

/** USD value per credit charged to user */
export const CREDIT_UNIT_VALUE_USD = 1 / CREDITS_PER_USD;

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
  const base = calculateCredits(input.modelId, input.mode);
  const promptBump =
    input.mode === "build" && (input.promptLength ?? 0) > 800
      ? Math.min(8, Math.floor((input.promptLength ?? 0) / 400))
      : 0;
  const fileBump =
    input.mode === "build" && (input.expectedFiles ?? 0) > 6
      ? Math.min(10, Math.floor((input.expectedFiles ?? 0) / 3))
      : 0;

  const providerCost = estimateProviderCostUsd(
    input.modelId,
    input.mode,
    input.inputTokens ?? null,
    input.outputTokens ?? null,
  );
  const fromUsage = creditsFromProviderCost(providerCost);

  const creditsMin = base + promptBump;
  const creditsMax = Math.max(creditsMin, fromUsage + fileBump);

  return {
    creditsMin,
    creditsMax,
    estimatedProviderCostUsd: providerCost,
  };
}

export function calculateCreditsForStagedBuild(input: {
  providerCostUsd: number;
  complexity: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  primaryModelId: string;
}): ChargeCalculationResult {
  const tokenCost =
    input.inputTokens != null && input.outputTokens != null
      ? estimateTokenProviderCostUsd(input.primaryModelId, input.inputTokens, input.outputTokens)
      : input.providerCostUsd;

  let floor = OP_MIN_CREDITS.build_simple ?? 8;
  if (input.complexity >= 8) floor = OP_MIN_CREDITS.build_hard ?? 35;
  else if (input.complexity >= 5) floor = OP_MIN_CREDITS.build_medium ?? 18;

  const fromCost = creditsFromProviderCost(Math.max(tokenCost, input.providerCostUsd));
  return {
    creditsToCharge: normalizeCreditCharge(Math.max(floor, fromCost)),
    estimatedProviderCostUsd: Math.max(tokenCost, input.providerCostUsd),
    marginMultiplier: DREAMOS_CREDIT_MARKUP,
  };
}

export function normalizeCreditCharge(amount: number): number {
  if (!Number.isFinite(amount) || amount < 1) return 1;
  return Math.ceil(amount);
}

export type ChargeCalculationInput = {
  modelId: string;
  mode: "discuss" | "edit" | "build";
  inputTokens?: number | null;
  outputTokens?: number | null;
  fileCount?: number;
};

export type ChargeCalculationResult = {
  creditsToCharge: number;
  estimatedProviderCostUsd: number;
  marginMultiplier: number;
};

const OP_MIN_CREDITS: Partial<Record<AiOperationType | "build_simple" | "build_medium" | "build_hard", number>> = {
  discuss_short: 1,
  discuss_deep: 2,
  build_plan: 3,
  app_identity: 2,
  build_simple: 8,
  build_medium: 18,
  build_hard: 35,
};

export function creditsFromProviderCost(providerCostUsd: number): number {
  const dreamosCharge = providerCostUsd * DREAMOS_CREDIT_MARKUP;
  return Math.max(1, Math.ceil(dreamosCharge / CREDIT_UNIT_VALUE_USD));
}

export function calculateCreditsToCharge(input: ChargeCalculationInput): ChargeCalculationResult {
  const est = estimateCreditsForOperation({
    mode: input.mode,
    modelId: input.modelId,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    expectedFiles: input.fileCount,
  });

  const fileBump =
    input.mode === "build" && (input.fileCount ?? 0) > 8
      ? Math.min(12, Math.floor((input.fileCount ?? 0) / 4))
      : 0;

  const fromProvider =
    input.inputTokens != null && input.outputTokens != null
      ? creditsFromProviderCost(
          estimateTokenProviderCostUsd(
            input.modelId,
            input.inputTokens,
            input.outputTokens,
          ),
        )
      : est.creditsMax;

  return {
    creditsToCharge: normalizeCreditCharge(Math.max(est.creditsMin, fromProvider) + fileBump),
    estimatedProviderCostUsd: est.estimatedProviderCostUsd,
    marginMultiplier: DREAMOS_CREDIT_MARKUP,
  };
}

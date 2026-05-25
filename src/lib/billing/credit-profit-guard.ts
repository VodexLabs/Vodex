import { FULL_BUILD_CAP_USD } from "@/lib/ai/cost-budget";
import {
  TARGET_REVENUE_MULTIPLIER,
  grossMarginFromCharge,
  minimumUserCreditsForProviderCost,
  providerUsdToInternalCredits,
  revenueMultiplierFromCharge,
  USER_CREDITS_PER_USD,
  type GenerationMode,
} from "@/lib/billing/pricing-config";
import { estimateProviderCostUsd } from "@/lib/credits/usage-cost";
import { estimateTokenProviderCostUsd } from "@/lib/credits/token-cost";

export type QuoteGenerationCostInput = {
  mode: GenerationMode;
  complexity?: number;
  selectedModel: string;
  estimatedProviderCostUsd?: number;
  estimatedInputTokens?: number | null;
  estimatedOutputTokens?: number | null;
  promptLength?: number;
  promptWasCompressed?: boolean;
  expectedFiles?: number;
  userPlan?: string | null;
  reserveBuffer?: number;
};

export type GenerationCostQuote = {
  userCreditsRequired: number;
  userCreditsReserved: number;
  internalCostCredits: number;
  /** Actual revenue_usd / provider_cost_usd */
  revenueMultiplier: number;
  estimatedGrossMargin: number;
  providerHardCapUsd: number;
  estimatedProviderCostUsd: number;
  floorReason: string;
  safeToRun: boolean;
  userFacingLabel: string;
  adminBreakdown: {
    productFloorCredits: number;
    minimumProfitableCredits: number;
    promptBump: number;
    fileBump: number;
    bufferApplied: number;
    revenueUsd: number;
    costUsd: number;
    modelId: string;
    mode: GenerationMode;
    complexity: number;
  };
};

function resolveProviderCostUsd(input: QuoteGenerationCostInput): number {
  if (input.estimatedProviderCostUsd != null && input.estimatedProviderCostUsd > 0) {
    return Math.min(input.estimatedProviderCostUsd, providerHardCapForMode(input.mode));
  }
  if (
    input.estimatedInputTokens != null &&
    input.estimatedOutputTokens != null &&
    input.estimatedInputTokens > 0
  ) {
    return Math.min(
      estimateTokenProviderCostUsd(
        input.selectedModel,
        input.estimatedInputTokens,
        input.estimatedOutputTokens,
      ),
      providerHardCapForMode(input.mode),
    );
  }
  const modeForEst =
    input.mode === "full_build"
      ? "build"
      : input.mode === "deploy" || input.mode === "polish"
        ? "edit"
        : input.mode;
  return Math.min(
    estimateProviderCostUsd(input.selectedModel, modeForEst as "discuss" | "edit" | "build"),
    providerHardCapForMode(input.mode),
  );
}

export function providerHardCapForMode(mode: GenerationMode): number {
  if (mode === "full_build" || mode === "build") return FULL_BUILD_CAP_USD;
  if (mode === "deploy") return 0.05;
  return 0.02;
}

/** Discuss / create-question — charge provider cost × 3 from actual or estimated usage. */
export function quoteDiscussCost(input: {
  selectedModel: string;
  estimatedProviderCostUsd?: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
}): GenerationCostQuote {
  const providerUsd =
    input.estimatedProviderCostUsd != null && input.estimatedProviderCostUsd > 0
      ? input.estimatedProviderCostUsd
      : input.inputTokens != null && input.outputTokens != null
        ? estimateTokenProviderCostUsd(input.selectedModel, input.inputTokens, input.outputTokens)
        : Math.min(estimateProviderCostUsd(input.selectedModel, "discuss"), 0.012);

  const userCreditsRequired = Math.max(0.1, minimumUserCreditsForProviderCost(providerUsd));
  const minProfitable = minimumUserCreditsForProviderCost(providerUsd);
  const revenueMultiplier = revenueMultiplierFromCharge(userCreditsRequired, providerUsd);
  const grossMargin = grossMarginFromCharge(userCreditsRequired, providerUsd);

  return {
    userCreditsRequired,
    userCreditsReserved: Math.max(userCreditsRequired, Math.ceil(userCreditsRequired * 1.1)),
    internalCostCredits: providerUsdToInternalCredits(providerUsd),
    revenueMultiplier,
    estimatedGrossMargin: grossMargin,
    providerHardCapUsd: 0.012,
    estimatedProviderCostUsd: providerUsd,
    floorReason: "target_revenue_3x",
    safeToRun: userCreditsRequired >= minProfitable,
    userFacingLabel: `Discuss · ~${userCreditsRequired} credits (3× provider cost)`,
    adminBreakdown: {
      productFloorCredits: 0,
      minimumProfitableCredits: minProfitable,
      promptBump: 0,
      fileBump: 0,
      bufferApplied: 1.1,
      revenueUsd: userCreditsRequired / USER_CREDITS_PER_USD,
      costUsd: providerUsd,
      modelId: input.selectedModel,
      mode: "discuss",
      complexity: 1,
    },
  };
}

/** Create-page question — same 3× provider cost rule as Discuss. */
export function quoteCreateQuestionCost(input: {
  selectedModel: string;
  estimatedProviderCostUsd?: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
}): GenerationCostQuote {
  const providerUsd =
    input.estimatedProviderCostUsd != null && input.estimatedProviderCostUsd > 0
      ? input.estimatedProviderCostUsd
      : input.inputTokens != null && input.outputTokens != null
        ? estimateTokenProviderCostUsd(input.selectedModel, input.inputTokens, input.outputTokens)
        : Math.min(estimateProviderCostUsd(input.selectedModel, "discuss"), 0.015);

  const userCreditsRequired = Math.max(0.1, minimumUserCreditsForProviderCost(providerUsd));
  const minProfitable = minimumUserCreditsForProviderCost(providerUsd);
  const revenueMultiplier = revenueMultiplierFromCharge(userCreditsRequired, providerUsd);
  const grossMargin = grossMarginFromCharge(userCreditsRequired, providerUsd);

  return {
    userCreditsRequired,
    userCreditsReserved: Math.max(userCreditsRequired, Math.ceil(userCreditsRequired * 1.1)),
    internalCostCredits: providerUsdToInternalCredits(providerUsd),
    revenueMultiplier,
    estimatedGrossMargin: grossMargin,
    providerHardCapUsd: 0.015,
    estimatedProviderCostUsd: providerUsd,
    floorReason: "target_revenue_3x",
    safeToRun: userCreditsRequired >= minProfitable,
    userFacingLabel: `Create question · ~${userCreditsRequired} credits (3× provider cost)`,
    adminBreakdown: {
      productFloorCredits: 0,
      minimumProfitableCredits: minProfitable,
      promptBump: 0,
      fileBump: 0,
      bufferApplied: 1.1,
      revenueUsd: userCreditsRequired / USER_CREDITS_PER_USD,
      costUsd: providerUsd,
      modelId: input.selectedModel,
      mode: "discuss" as GenerationMode,
      complexity: 1,
    },
  };
}

export function quoteGenerationCost(input: QuoteGenerationCostInput): GenerationCostQuote {
  if (input.mode === "discuss") {
    return quoteDiscussCost({
      selectedModel: input.selectedModel,
      estimatedProviderCostUsd: input.estimatedProviderCostUsd,
      inputTokens: input.estimatedInputTokens,
      outputTokens: input.estimatedOutputTokens,
    });
  }

  const complexity = Math.min(10, Math.max(1, input.complexity ?? 5));
  const providerUsd = resolveProviderCostUsd(input);
  const internalCostCredits = providerUsdToInternalCredits(providerUsd);
  const minimumProfitable = minimumUserCreditsForProviderCost(providerUsd);
  const userCreditsRequired = Math.max(1, minimumProfitable);
  const buffer = input.reserveBuffer ?? 1.1;
  const userCreditsReserved = Math.max(
    userCreditsRequired,
    Math.ceil(userCreditsRequired * buffer),
  );

  const revenueMultiplier = revenueMultiplierFromCharge(userCreditsRequired, providerUsd);
  const grossMargin = grossMarginFromCharge(userCreditsRequired, providerUsd);

  const modeLabel =
    input.mode === "full_build"
      ? "Full app build"
      : input.mode === "build"
        ? "App build"
        : input.mode === "edit"
          ? "Targeted edit"
          : input.mode === "deploy"
          ? "Deploy preparation"
          : input.mode === "polish"
            ? "Polish pass"
            : input.mode === "repair"
              ? "AI repair"
              : "Conversation";

  const floorReason = "target_revenue_3x";

  return {
    userCreditsRequired,
    userCreditsReserved,
    internalCostCredits,
    revenueMultiplier,
    estimatedGrossMargin: grossMargin,
    providerHardCapUsd: providerHardCapForMode(input.mode),
    estimatedProviderCostUsd: providerUsd,
    floorReason,
    safeToRun:
      minimumProfitable === 0 ||
      revenueMultiplier >= TARGET_REVENUE_MULTIPLIER - 0.001,
    userFacingLabel: `${modeLabel} · ~${userCreditsRequired} credits`,
    adminBreakdown: {
      productFloorCredits: 0,
      minimumProfitableCredits: minimumProfitable,
      promptBump: 0,
      fileBump: 0,
      bufferApplied: buffer,
      revenueUsd: userCreditsRequired / USER_CREDITS_PER_USD,
      costUsd: providerUsd,
      modelId: input.selectedModel,
      mode: input.mode,
      complexity,
    },
  };
}

export function assertProfitableCharge(
  userCredits: number,
  providerCostUsd: number,
): { ok: boolean; reason?: string } {
  const minUser = minimumUserCreditsForProviderCost(providerCostUsd);
  if (providerCostUsd > 0 && userCredits < minUser) {
    return {
      ok: false,
      reason: `Charge ${userCredits} below ${TARGET_REVENUE_MULTIPLIER}× revenue minimum ${minUser} (provider $${providerCostUsd.toFixed(4)})`,
    };
  }
  return { ok: true };
}

export function creditsFromProviderCostUsd(providerCostUsd: number): number {
  return Math.max(1, minimumUserCreditsForProviderCost(providerCostUsd));
}

/** @deprecated Use revenueMultiplier on quote */
export function estimatedGrossMargin(userCredits: number, providerCostUsd: number): number {
  return grossMarginFromCharge(userCredits, providerCostUsd);
}

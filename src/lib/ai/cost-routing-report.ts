/**
 * Verifiable before/after provider cost estimates for staged routing changes.
 * Uses the same token-cost table as billing guards — not marketing numbers.
 */
import type { AiOperationType } from "@/lib/ai/operation-types";
import { estimateTokenProviderCostUsd } from "@/lib/credits/token-cost";

export type BuildStageEstimate = {
  operationType: AiOperationType;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

const TYPICAL_BUILD_STAGES: Array<{
  operationType: AiOperationType;
  inputTokens: number;
  outputTokens: number;
}> = [
  { operationType: "build_plan", inputTokens: 1200, outputTokens: 900 },
  { operationType: "app_identity", inputTokens: 900, outputTokens: 400 },
  { operationType: "icon_svg_generation", inputTokens: 600, outputTokens: 500 },
  { operationType: "schema_design", inputTokens: 1400, outputTokens: 1100 },
  { operationType: "ui_design_plan", inputTokens: 1600, outputTokens: 1200 },
  { operationType: "frontend_implementation", inputTokens: 3500, outputTokens: 3200 },
  { operationType: "backend_implementation", inputTokens: 2800, outputTokens: 2400 },
  { operationType: "code_repair_small", inputTokens: 2000, outputTokens: 1500 },
];

/** Pre-optimization: Sonnet/Opus on every stage (no cheap discuss/plan split). */
function legacyModelForStage(
  operationType: AiOperationType,
  complexity: number,
): string {
  const sonnet = "claude-sonnet-4.5";
  const opus = complexity >= 8 ? "claude-opus-4.6" : sonnet;
  switch (operationType) {
    case "build_plan":
    case "schema_design":
    case "ui_design_plan":
    case "app_identity":
    case "icon_svg_generation":
      return sonnet;
    case "frontend_implementation":
    case "backend_implementation":
      return opus;
    case "code_repair_small":
      return sonnet;
    default:
      return sonnet;
  }
}

/** Current optimized routing (matches model-router after cost pass). */
function optimizedModelForStage(
  operationType: AiOperationType,
  complexity: number,
): string {
  const cheap = "gpt-5.4-mini";
  const haiku = "claude-haiku-4.5";
  const sonnet46 = "claude-sonnet-4.6";
  const opus47 = "claude-opus-4.7";
  const opus46 = "claude-opus-4.6";

  switch (operationType) {
    case "build_plan":
    case "schema_design":
    case "ui_design_plan":
    case "icon_svg_generation":
      return cheap;
    case "app_identity":
      return haiku;
    case "frontend_implementation":
    case "backend_implementation":
      if (complexity >= 9) return opus47;
      if (complexity >= 7) return opus46;
      if (complexity >= 5) return sonnet46;
      return cheap;
    case "code_repair_small":
      return haiku;
    default:
      return cheap;
  }
}

function estimateStages(
  pickModel: (op: AiOperationType, complexity: number) => string,
  complexity: number,
  includeBackend: boolean,
  includeRepair: boolean,
): BuildStageEstimate[] {
  const stages = TYPICAL_BUILD_STAGES.filter((s) => {
    if (s.operationType === "backend_implementation" && !includeBackend) return false;
    if (s.operationType === "code_repair_small" && !includeRepair) return false;
    return true;
  });

  return stages.map((s) => {
    const modelId = pickModel(s.operationType, complexity);
    return {
      operationType: s.operationType,
      modelId,
      inputTokens: s.inputTokens,
      outputTokens: s.outputTokens,
      costUsd: estimateTokenProviderCostUsd(modelId, s.inputTokens, s.outputTokens),
    };
  });
}

export type CostRoutingComparison = {
  complexity: number;
  includeBackend: boolean;
  includeRepair: boolean;
  legacy: { stages: BuildStageEstimate[]; totalUsd: number };
  optimized: { stages: BuildStageEstimate[]; totalUsd: number };
  savingsUsd: number;
  savingsPercent: number;
  discussLegacyUsd: number;
  discussOptimizedUsd: number;
};

export function compareCostRouting(
  complexity = 6,
  opts?: { includeBackend?: boolean; includeRepair?: boolean },
): CostRoutingComparison {
  const includeBackend = opts?.includeBackend ?? complexity >= 5;
  const includeRepair = opts?.includeRepair ?? true;

  const legacyStages = estimateStages(legacyModelForStage, complexity, includeBackend, includeRepair);
  const optimizedStages = estimateStages(
    optimizedModelForStage,
    complexity,
    includeBackend,
    includeRepair,
  );

  const legacyTotal = legacyStages.reduce((s, x) => s + x.costUsd, 0);
  const optimizedTotal = optimizedStages.reduce((s, x) => s + x.costUsd, 0);
  const savingsUsd = Math.max(0, legacyTotal - optimizedTotal);
  const savingsPercent =
    legacyTotal > 0 ? Math.round((savingsUsd / legacyTotal) * 1000) / 10 : 0;

  const discussIn = 800;
  const discussOut = 600;
  const discussLegacy = estimateTokenProviderCostUsd("claude-sonnet-4.5", discussIn, discussOut);
  const discussOptimized = estimateTokenProviderCostUsd(
    pickCheapestDiscussForReport(),
    discussIn,
    discussOut,
  );

  return {
    complexity,
    includeBackend,
    includeRepair,
    legacy: { stages: legacyStages, totalUsd: Math.round(legacyTotal * 10000) / 10000 },
    optimized: {
      stages: optimizedStages,
      totalUsd: Math.round(optimizedTotal * 10000) / 10000,
    },
    savingsUsd: Math.round(savingsUsd * 10000) / 10000,
    savingsPercent,
    discussLegacyUsd: Math.round(discussLegacy * 10000) / 10000,
    discussOptimizedUsd: Math.round(discussOptimized * 10000) / 10000,
  };
}

function pickCheapestDiscussForReport(): string {
  return "gpt-5.4-mini";
}

/** Summaries at complexity 5, 7, and 9 for admin / diagnostics UI. */
export function costRoutingReportMatrix(): CostRoutingComparison[] {
  return [5, 7, 9].map((c) =>
    compareCostRouting(c, {
      includeBackend: c >= 5,
      includeRepair: true,
    }),
  );
}

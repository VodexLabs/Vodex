import type { AiOperationType } from "@/lib/ai/operation-types";
import { estimateTokenProviderCostUsd } from "@/lib/credits/token-cost";

export const GLOBAL_MAX_OUTPUT_TOKENS = 4000;
export const GLOBAL_MAX_VISIBLE_OUTPUT_TOKENS = 900;
/** Hard cap for a single staged build (provider USD, pre-markup). */
export const FULL_BUILD_CAP_USD = 0.025;
export const OWNER_ULTRA_CAP_USD = 0.08;

const OP_BUDGET_USD: Partial<Record<AiOperationType, number>> = {
  classify_intent: 0.0002,
  normalize_prompt: 0.0002,
  safety_scope_check: 0.0002,
  discuss_short: 0.0008,
  discuss_deep: 0.0015,
  build_intake: 0.0003,
  build_plan: 0.0012,
  app_identity: 0.001,
  icon_svg_generation: 0.001,
  schema_design: 0.0012,
  ui_design_plan: 0.0015,
  integration_stub: 0.0012,
  file_validation: 0.0006,
  preview_validation: 0.0006,
  code_repair_small: 0.002,
  code_repair_hard: 0.004,
  diagnostics_summary: 0.002,
  publish_readiness: 0.001,
  admin_debug_summary: 0.002,
  edit_target_detection: 0.001,
  edit_patch_small: 0.006,
  edit_patch_hard: 0.01,
  discuss_stream: 0.004,
  edit_stream: 0.012,
  deep_architecture_review: 0.05,
  massive_context_review: 0.06,
  emergency_hard_repair: 0.025,
};

export function maxBudgetForOperation(
  op: AiOperationType,
  complexity = 5,
): number {
  if (op === "frontend_implementation") {
    if (complexity <= 4) return 0.003;
    if (complexity <= 7) return 0.006;
    return 0.01;
  }
  if (op === "backend_implementation") {
    if (complexity <= 4) return 0.0025;
    if (complexity <= 7) return 0.005;
    return 0.008;
  }
  return OP_BUDGET_USD[op] ?? 0.002;
}

export type BudgetCheckInput = {
  operationType: AiOperationType;
  modelId: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  complexity?: number;
  accumulatedCostUsd?: number;
};

export type BudgetCheckResult = {
  allowed: boolean;
  estimatedCostUsd: number;
  maxAllowedUsd: number;
  cappedOutputTokens: number;
  reason?: string;
};

export function checkOperationBudget(input: BudgetCheckInput): BudgetCheckResult {
  const isChatVisible =
    input.operationType.startsWith("discuss") ||
    input.operationType === "edit_stream";
  const cappedOutput = Math.min(
    input.maxOutputTokens,
    GLOBAL_MAX_OUTPUT_TOKENS,
    isChatVisible ? GLOBAL_MAX_VISIBLE_OUTPUT_TOKENS : GLOBAL_MAX_OUTPUT_TOKENS,
  );
  const estimated = estimateTokenProviderCostUsd(
    input.modelId,
    input.maxInputTokens,
    cappedOutput,
  );
  const maxAllowed = maxBudgetForOperation(input.operationType, input.complexity ?? 5);
  const accumulated = input.accumulatedCostUsd ?? 0;

  if (accumulated + estimated > FULL_BUILD_CAP_USD && input.operationType.includes("implementation")) {
    return {
      allowed: false,
      estimatedCostUsd: estimated,
      maxAllowedUsd: FULL_BUILD_CAP_USD,
      cappedOutputTokens: cappedOutput,
      reason: "full_build_cap_exceeded",
    };
  }

  if (estimated > maxAllowed) {
    return {
      allowed: false,
      estimatedCostUsd: estimated,
      maxAllowedUsd: maxAllowed,
      cappedOutputTokens: Math.max(200, Math.floor(cappedOutput * (maxAllowed / estimated))),
      reason: "operation_budget_exceeded",
    };
  }

  return {
    allowed: true,
    estimatedCostUsd: estimated,
    maxAllowedUsd: maxAllowed,
    cappedOutputTokens: cappedOutput,
  };
}

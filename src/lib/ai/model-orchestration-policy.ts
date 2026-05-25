/**
 * Cost-first model orchestration policy — single policy doc for routing.
 * Normal users never see this; admin AI usage reads decision records.
 */
import type { AiOperationType } from "@/lib/ai/operation-types";

/** Cheap OpenAI catalog model for understanding, planning, discuss, compression. */
export const CHEAP_PLANNER_MODEL_ID = "gpt-5-4-mini";

/** Operations that must stay on cheap models (never Claude-first). */
export const CHEAP_PLANNER_OPERATIONS: readonly AiOperationType[] = [
  "classify_intent",
  "normalize_prompt",
  "safety_scope_check",
  "discuss_short",
  "discuss_stream",
  "discuss_deep",
  "build_intake",
  "build_plan",
  "file_validation",
  "diagnostics_summary",
] as const;

/** Heavy work — Claude when available + budget allows; else OpenAI fallback. */
export const HEAVY_MODEL_OPERATIONS: readonly AiOperationType[] = [
  "frontend_implementation",
  "backend_implementation",
  "integration_stub",
  "ui_design_plan",
  "schema_design",
  "deep_architecture_review",
  "massive_context_review",
  "emergency_hard_repair",
  "app_identity",
] as const;

export type OrchestrationTier = "cheap_planner" | "heavy" | "standard";

export type ModelDecisionRecord = {
  operationType: string;
  selectedModel: string;
  provider: string;
  tier: OrchestrationTier;
  usedCheapPlanner: boolean;
  usedHeavyModel: boolean;
  fallbackReason: string | null;
  estimatedCostBucket: "micro" | "low" | "medium" | "high";
  timestamp: string;
};

const recent: ModelDecisionRecord[] = [];
const MAX = 200;

export function classifyOperationTier(operationType: AiOperationType): OrchestrationTier {
  if ((CHEAP_PLANNER_OPERATIONS as readonly string[]).includes(operationType)) return "cheap_planner";
  if ((HEAVY_MODEL_OPERATIONS as readonly string[]).includes(operationType)) return "heavy";
  return "standard";
}

export function estimateCostBucket(operationType: AiOperationType): ModelDecisionRecord["estimatedCostBucket"] {
  const tier = classifyOperationTier(operationType);
  if (tier === "cheap_planner") return "micro";
  if (tier === "heavy") return "high";
  return "low";
}

export function recordModelDecision(
  input: Omit<ModelDecisionRecord, "timestamp">,
): ModelDecisionRecord {
  const record = { ...input, timestamp: new Date().toISOString() };
  recent.unshift(record);
  if (recent.length > MAX) recent.length = MAX;
  if (process.env.NODE_ENV !== "production") {
    console.info("[model-orchestration]", record.operationType, record.selectedModel, record.tier);
  }
  return record;
}

export function getRecentModelDecisions(limit = 50): ModelDecisionRecord[] {
  return recent.slice(0, limit);
}

export function isCheapPlannerOperation(operationType: AiOperationType): boolean {
  return classifyOperationTier(operationType) === "cheap_planner";
}

export function isHeavyModelOperation(operationType: AiOperationType): boolean {
  return classifyOperationTier(operationType) === "heavy";
}

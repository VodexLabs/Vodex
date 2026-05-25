/**
 * Heavy-model input budget for first-pass builds.
 * Shared execution brief + small per-stage slices — never duplicate full plan everywhere.
 */
import {
  estimatePromptTokens,
  HEAVY_MODEL_INPUT_ABSOLUTE_CAP,
  HEAVY_MODEL_INPUT_TOKEN_BUDGET,
  HeavyInputBudgetExceededError,
  MAX_HEAVY_EXECUTION_BRIEF_TOKENS,
  sliceToTokenBudget,
  STAGE_INSTRUCTION_MAX_TOKENS,
} from "@/lib/ai/prompt-compression-policy";

export type HeavyStageKind =
  | "build_plan"
  | "app_identity"
  | "schema_design"
  | "ui_design_plan"
  | "frontend_implementation"
  | "backend_implementation"
  | "code_repair";

export type BuildContextSlices = {
  contextId: string;
  executionBrief: string;
  briefTokens: number;
  scopeNote: string;
  planSlice: string;
  schemaSlice: string;
  uiSlice: string;
};

const STAGE_BRIEF_SLICES: Record<HeavyStageKind, number> = {
  build_plan: 1200,
  app_identity: 400,
  schema_design: 600,
  ui_design_plan: 500,
  frontend_implementation: 800,
  backend_implementation: 500,
  code_repair: 400,
};

const STAGE_OBJECTIVES: Record<HeavyStageKind, string> = {
  build_plan: "Produce build plan JSON for first-pass preview scope.",
  app_identity: "Name app, slug, theme — JSON only.",
  schema_design: "Minimal demo-safe entities for preview.",
  ui_design_plan: "Navigation + screens for preview-ready UI.",
  frontend_implementation: "Generate route files — preview-first, demo data.",
  backend_implementation: "Only if essential — minimal API/demo layer.",
  code_repair: "Fix listed quality issues only.",
};

export function createBuildContextSlices(
  executionBrief: string,
  scopeNote: string,
  operationId: string,
  planJson?: string,
  schemaJson?: string,
  uiJson?: string,
): BuildContextSlices {
  const briefTokens = estimatePromptTokens(executionBrief);
  return {
    contextId: operationId,
    executionBrief: sliceToTokenBudget(executionBrief, MAX_HEAVY_EXECUTION_BRIEF_TOKENS),
    briefTokens,
    scopeNote: sliceToTokenBudget(scopeNote, 300),
    planSlice: sliceToTokenBudget(planJson ?? "", 600),
    schemaSlice: sliceToTokenBudget(schemaJson ?? "", 400),
    uiSlice: sliceToTokenBudget(uiJson ?? "", 400),
  };
}

export function buildStageObjective(stage: HeavyStageKind): string {
  return sliceToTokenBudget(STAGE_OBJECTIVES[stage], STAGE_INSTRUCTION_MAX_TOKENS);
}

/** Build a stage prompt from shared context slices — not the full raw prompt. */
export function sliceBriefForStage(slices: BuildContextSlices, stage: HeavyStageKind): string {
  const maxTokens = STAGE_BRIEF_SLICES[stage];
  return sliceToTokenBudget(slices.executionBrief, maxTokens);
}

export class HeavyInputBudgetTracker {
  private totalTokens = 0;

  record(parts: string[]): number {
    const stageTokens = parts.reduce((sum, p) => sum + estimatePromptTokens(p), 0);
    this.totalTokens += stageTokens;
    return stageTokens;
  }

  get total(): number {
    return this.totalTokens;
  }

  assertWithinBudget(absolute = false): void {
    const cap = absolute ? HEAVY_MODEL_INPUT_ABSOLUTE_CAP : HEAVY_MODEL_INPUT_TOKEN_BUDGET;
    if (this.totalTokens > cap) {
      throw new HeavyInputBudgetExceededError(this.totalTokens, cap);
    }
  }

  remainingBudget(): number {
    return Math.max(0, HEAVY_MODEL_INPUT_TOKEN_BUDGET - this.totalTokens);
  }
}

export function estimateFirstPassHeavyInput(
  executionBrief: string,
  stageCount = 6,
): number {
  const briefPerStage = sliceToTokenBudget(executionBrief, 800);
  const perStage = estimatePromptTokens(briefPerStage) + STAGE_INSTRUCTION_MAX_TOKENS + 200;
  return perStage * stageCount;
}

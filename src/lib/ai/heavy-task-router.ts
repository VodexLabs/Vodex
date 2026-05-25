/**
 * Heavy task router — Claude only when justified, available, and budget allows.
 */
import type { AiOperationType } from "@/lib/ai/operation-types";
import { pickFailoverCatalogModel, providerFromModelId } from "@/lib/ai/provider-errors";
import { isProviderSelectable } from "@/lib/ai/provider-availability";
import {
  HEAVY_MODEL_OPERATIONS,
  isHeavyModelOperation,
  recordModelDecision,
  estimateCostBucket,
} from "@/lib/ai/model-orchestration-policy";
import { isAnthropicAvailableForHeavyWork } from "@/lib/ai/provider-budget-guard";
import { pickCheapPlannerModel } from "@/lib/ai/cheap-planner";

export type HeavyRouteResult = {
  modelId: string;
  provider: ReturnType<typeof providerFromModelId>;
  usedHeavyModel: boolean;
  fallbackReason: string | null;
};

const CLAUDE_HEAVY_PREFERRED = "claude-opus-4-7";
const CLAUDE_HEAVY_MID = "claude-sonnet-4-6";
const CLAUDE_HEAVY_FAST = "claude-haiku-4-5";

/** Route heavy codegen/architecture — Claude if available, else OpenAI implementation model. */
export function routeHeavyTask(
  operationType: AiOperationType,
  opts?: { complexity?: number; requestedModelId?: string | null },
): HeavyRouteResult {
  if (!isHeavyModelOperation(operationType)) {
    const cheap = pickCheapPlannerModel();
    return {
      modelId: cheap.modelId,
      provider: cheap.provider,
      usedHeavyModel: false,
      fallbackReason: "not_heavy_operation",
    };
  }

  const anthropicOk = isAnthropicAvailableForHeavyWork();
  let modelId = opts?.requestedModelId ?? CLAUDE_HEAVY_PREFERRED;
  let fallbackReason: string | null = null;
  let usedHeavy = false;

  if (anthropicOk && isProviderSelectable("anthropic")) {
    if (operationType === "app_identity" || (opts?.complexity ?? 0) < 4) {
      modelId = CLAUDE_HEAVY_FAST;
    } else if ((opts?.complexity ?? 5) >= 7) {
      modelId = CLAUDE_HEAVY_PREFERRED;
    } else {
      modelId = CLAUDE_HEAVY_MID;
    }
    usedHeavy = modelId.includes("claude");
  } else {
    fallbackReason = anthropicOk ? "anthropic_not_selectable" : "anthropic_budget_or_quota";
    const alt = pickFailoverCatalogModel("anthropic", operationType);
    modelId = alt ?? pickCheapPlannerModel().modelId;
    usedHeavy = false;
  }

  const provider = providerFromModelId(modelId);
  recordModelDecision({
    operationType,
    selectedModel: modelId,
    provider,
    tier: "heavy",
    usedCheapPlanner: !usedHeavy,
    usedHeavyModel: usedHeavy,
    fallbackReason,
    estimatedCostBucket: estimateCostBucket(operationType),
  });

  return { modelId, provider, usedHeavyModel: usedHeavy, fallbackReason };
}

export { HEAVY_MODEL_OPERATIONS, isHeavyModelOperation };

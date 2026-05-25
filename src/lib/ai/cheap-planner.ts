/**
 * Cheap planner — GPT-4o-mini (or Google fallback) for understanding, discuss, compression.
 */
import { resolveDiscussModel } from "@/lib/ai/provider-fallback";
import { isProviderSelectable } from "@/lib/ai/provider-availability";
import { providerFromModelId } from "@/lib/ai/provider-errors";
import { CHEAP_PLANNER_MODEL_ID } from "@/lib/ai/model-orchestration-policy";

export type CheapPlannerResult = {
  modelId: string;
  provider: ReturnType<typeof providerFromModelId>;
  isFallback: boolean;
  reason: string;
};

/** Default discuss / intent / compression model — OpenAI-first, skips exhausted Anthropic. */
export function pickCheapDiscussModel(requestedModelId?: string | null): CheapPlannerResult {
  const resolved = resolveDiscussModel(requestedModelId);
  return {
    modelId: resolved.modelId,
    provider: resolved.provider,
    isFallback: resolved.isFallback,
    reason: resolved.reason,
  };
}

/** Explicit cheap planner model for non-discuss cheap ops. */
export function pickCheapPlannerModel(): CheapPlannerResult {
  if (isProviderSelectable("openai")) {
    return {
      modelId: CHEAP_PLANNER_MODEL_ID,
      provider: "openai",
      isFallback: false,
      reason: "cheap_planner_openai",
    };
  }
  if (isProviderSelectable("google")) {
    return { modelId: "gemini-flash", provider: "google", isFallback: true, reason: "cheap_planner_google" };
  }
  const fallback = pickCheapDiscussModel(null);
  return { ...fallback, reason: "cheap_planner_last_resort" };
}

export { CHEAP_PLANNER_MODEL_ID };

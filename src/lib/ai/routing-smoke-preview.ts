/**
 * Dry-run routing preview for admin smoke — no provider calls unless live mode.
 */
import { routeOperation } from "@/lib/ai/model-router";
import { resolveDiscussModel, resolveModelWithFallback } from "@/lib/ai/provider-fallback";
import { routeHeavyTask } from "@/lib/ai/heavy-task-router";
import {
  classifyOperationTier,
  estimateCostBucket,
  type ModelDecisionRecord,
} from "@/lib/ai/model-orchestration-policy";
import { pickCheapDiscussModel } from "@/lib/ai/cheap-planner";
import { isProviderSelectable } from "@/lib/ai/provider-availability";
import { hasAnyLlmProviderKey } from "@/lib/llm/env-keys";
import type { AiOperationType } from "@/lib/ai/operation-types";

export type RoutingSmokeMode = "discuss" | "planning" | "edit" | "heavy_build";

export type RoutingSmokePreviewRow = {
  mode: RoutingSmokeMode;
  operationType: AiOperationType;
  selectedCatalogModelId: string;
  apiModelId: string;
  provider: string;
  routeReason: string;
  orchestrationTier: ReturnType<typeof classifyOperationTier>;
  estimatedCostBucket: ModelDecisionRecord["estimatedCostBucket"];
  fallbackApplied: boolean;
  fallbackReason: string | null;
  policyNote: string;
};

const MODE_OPS: Record<RoutingSmokeMode, { op: AiOperationType; complexity: number; note: string }> = {
  discuss: {
    op: "discuss_stream",
    complexity: 3,
    note: "Cheapest reliable model — never heavy Claude/Pro for simple chat",
  },
  planning: {
    op: "build_plan",
    complexity: 5,
    note: "Cheap planner first (OpenAI mini or Gemini Flash); no build files generated",
  },
  edit: {
    op: "edit_stream",
    complexity: 5,
    note: "Standard fast tier for patches; escalates only on edit_patch_hard",
  },
  heavy_build: {
    op: "backend_implementation",
    complexity: 8,
    note: "Heavy route for implementation — Claude when enabled, else OpenAI/Gemini fallback",
  },
};

export function previewRoutingForMode(mode: RoutingSmokeMode): RoutingSmokePreviewRow {
  const cfg = MODE_OPS[mode];
  const discuss = resolveDiscussModel(null);

  if (mode === "discuss") {
    const spec = routeOperation({ operationType: cfg.op, complexity: cfg.complexity });
    return {
      mode,
      operationType: cfg.op,
      selectedCatalogModelId: spec.modelId,
      apiModelId: spec.apiModelId,
      provider: spec.provider,
      routeReason: spec.routeReason,
      orchestrationTier: classifyOperationTier(cfg.op),
      estimatedCostBucket: estimateCostBucket(cfg.op),
      fallbackApplied: discuss.isFallback,
      fallbackReason: discuss.isFallback ? discuss.reason : null,
      policyNote: cfg.note,
    };
  }

  if (mode === "planning") {
    const cheap = pickCheapDiscussModel(null);
    const spec = routeOperation({ operationType: cfg.op, complexity: cfg.complexity });
    return {
      mode,
      operationType: cfg.op,
      selectedCatalogModelId: spec.modelId,
      apiModelId: spec.apiModelId,
      provider: spec.provider,
      routeReason: `${spec.routeReason}; cheap_planner=${cheap.modelId}`,
      orchestrationTier: classifyOperationTier(cfg.op),
      estimatedCostBucket: estimateCostBucket(cfg.op),
      fallbackApplied: cheap.isFallback,
      fallbackReason: cheap.isFallback ? cheap.reason : null,
      policyNote: cfg.note,
    };
  }

  if (mode === "heavy_build") {
    const heavy = routeHeavyTask(cfg.op, { complexity: cfg.complexity });
    const spec = routeOperation({
      operationType: cfg.op,
      complexity: cfg.complexity,
      requestedModelId: heavy.modelId,
    });
    return {
      mode,
      operationType: cfg.op,
      selectedCatalogModelId: spec.modelId,
      apiModelId: spec.apiModelId,
      provider: spec.provider,
      routeReason: spec.routeReason,
      orchestrationTier: "heavy",
      estimatedCostBucket: estimateCostBucket(cfg.op),
      fallbackApplied: Boolean(heavy.fallbackReason),
      fallbackReason: heavy.fallbackReason,
      policyNote: cfg.note,
    };
  }

  // edit
  const spec = routeOperation({ operationType: cfg.op, complexity: cfg.complexity });
  const withFallback = resolveModelWithFallback(spec.modelId, cfg.op);
  return {
    mode,
    operationType: cfg.op,
    selectedCatalogModelId: withFallback.modelId,
    apiModelId: spec.apiModelId,
    provider: withFallback.provider,
    routeReason: spec.routeReason,
    orchestrationTier: classifyOperationTier(cfg.op),
    estimatedCostBucket: estimateCostBucket(cfg.op),
    fallbackApplied: withFallback.isFallback,
    fallbackReason: withFallback.isFallback ? withFallback.reason : null,
    policyNote: cfg.note,
  };
}

export function previewAllRoutingModes(): RoutingSmokePreviewRow[] {
  return (["discuss", "planning", "edit", "heavy_build"] as RoutingSmokeMode[]).map(previewRoutingForMode);
}

export function routingSmokePreflight(): { ok: boolean; blockers: string[] } {
  const blockers: string[] = [];
  if (!hasAnyLlmProviderKey()) blockers.push("No LLM API keys configured");
  if (!isProviderSelectable("openai") && !isProviderSelectable("google")) {
    blockers.push("No selectable OpenAI or Google provider for fallback routing");
  }
  return { ok: blockers.length === 0, blockers };
}

export const ROUTING_SMOKE_DISCLAIMER =
  "Admin routing preview only — not full build cost, not a benchmark, not user discuss mode. Proves model selection policy without generating app files.";

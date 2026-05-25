/**
 * Huge prompt intake pipeline — cheap model or deterministic parser compresses
 * long prompts before any heavy model sees them.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { callProviderStructured, parseJsonFromModel } from "@/lib/ai/provider-call";
import { recordMemoryBatch } from "@/lib/creation/memory";
import {
  processChunkedHugePromptIntake,
} from "@/lib/ai/chunked-huge-prompt-intake";
import {
  BUILD_CONTEXT_MEMORY_KEY,
  enforceExecutionBriefHardCap,
  estimatePromptTokens,
  ORIGINAL_PROMPT_FULL_MEMORY_KEY,
  ORIGINAL_PROMPT_MEMORY_KEY,
  rawPromptBlockedFromHeavyModel,
  requiresChunkedIntake,
  requiresHugePromptIntake,
} from "@/lib/ai/prompt-compression-policy";
import { planFirstPassScope, type FirstPassScope } from "@/lib/build/first-pass-scope";
import type { BuildIntakeSummary } from "@/lib/ai/build-intake-types";
import { backlogItemsFromIntake, persistBuildBacklog } from "@/lib/build/build-backlog";

export type { BuildIntakeSummary } from "@/lib/ai/build-intake-types";

export type HugePromptIntakeResult = {
  originalPrompt: string;
  wasHuge: boolean;
  usedCheapModel: boolean;
  usedChunkedIntake: boolean;
  summary: BuildIntakeSummary;
  executionPlanText: string;
  executionPlanJson: Record<string, unknown>;
  firstPassScope: FirstPassScope;
  rawPromptSentToHeavyModel: false;
  helperModelId?: string;
  intakeProviderCostUsd: number;
};

const INTAKE_JSON_SCHEMA = `Return strict JSON:
{
  "app_purpose": "string",
  "target_users": "string",
  "core_screens": ["string"],
  "visual_style": "string",
  "main_data_entities": ["string"],
  "must_have_first_version": ["string"],
  "nice_to_have_later": ["string"],
  "complex_backend_requirements": ["string"],
  "unresolved_questions": ["string"],
  "estimated_complexity": 1-10
}`;

function splitFeatureCandidates(text: string): string[] {
  return text
    .split(/\n|[;,]|(?:\band\b)/i)
    .map((p) => p.replace(/^[\d\-*•.]+\s*/, "").trim())
    .filter((p) => p.length > 8 && p.length < 200);
}

function deterministicIntake(rawPrompt: string): BuildIntakeSummary {
  const parts = splitFeatureCandidates(rawPrompt);
  const lower = rawPrompt.toLowerCase();

  const screens = parts.filter((p) => /\b(page|screen|view|dashboard|tab|home|landing)\b/i.test(p)).slice(0, 8);
  const entities = parts.filter((p) => /\b(table|entity|model|schema|database|record|user|order|product)\b/i.test(p)).slice(0, 8);
  const integrations = parts.filter((p) =>
    /\b(stripe|paypal|supabase|firebase|oauth|api|webhook|integration|auth|payment)\b/i.test(p),
  );

  const mustHave = parts.slice(0, 50);
  const niceToHave = parts.slice(50, 100);

  const purposeMatch = rawPrompt.match(/(?:build|create|make)\s+(?:a|an|the)?\s*([^.\n]{10,120})/i);
  const appPurpose = purposeMatch?.[1]?.trim() ?? parts[0]?.slice(0, 120) ?? "Custom application";

  let complexity = 4;
  if (integrations.length >= 3) complexity += 2;
  if (screens.length >= 6) complexity += 1;
  if (rawPrompt.length > 8000) complexity += 1;
  complexity = Math.min(10, complexity);

  return {
    appPurpose,
    targetUsers: /\b(user|customer|team|admin|student|patient)\b/i.test(lower)
      ? "Defined in prompt audience signals"
      : "General users",
    coreScreens: screens.length ? screens : mustHave.slice(0, 5).map((f) => f.slice(0, 60)),
    visualStyle: /\b(dark|light|minimal|modern|glass|gradient|neon|clean)\b/i.test(lower)
      ? (lower.match(/\b(dark mode|light mode|minimal|modern|glassmorphism|gradient|neon|clean)\b/i)?.[0] ?? "Modern clean UI")
      : "Modern, polished UI with consistent design system",
    mainDataEntities: entities.length ? entities : ["Core records"],
    mustHaveFirstVersionFeatures: mustHave,
    niceToHaveLaterFeatures: niceToHave,
    complexBackendRequirements: integrations,
    unresolvedQuestions: [],
    estimatedComplexity: complexity,
    promptTokenEstimate: estimatePromptTokens(rawPrompt),
    compressedTokenEstimate: 0,
  };
}

function summaryToExecutionPlan(summary: BuildIntakeSummary, scope: FirstPassScope): string {
  const lines = [
    `# Build execution plan (compressed)`,
    `Purpose: ${summary.appPurpose}`,
    `Users: ${summary.targetUsers}`,
    `Style: ${summary.visualStyle}`,
    `First-pass tier: ${scope.tier}`,
    ``,
    `## Core screens`,
    ...summary.coreScreens.slice(0, 8).map((s) => `- ${s}`),
    ``,
    `## Data entities`,
    ...summary.mainDataEntities.slice(0, 6).map((e) => `- ${e}`),
    ``,
    `## Build in this pass (${scope.firstPassTaskCount} tasks)`,
    ...scope.mustHaveFeatures.slice(0, scope.firstPassTaskCount).map((f) => `- ${f}`),
    ``,
    `## Queued for later (${scope.backlogTaskCount} tasks)`,
    ...scope.deferredFeatures.slice(0, 8).map((f) => `- ${f}`),
  ];
  if (summary.unresolvedQuestions.length) {
    lines.push("", "## Open questions", ...summary.unresolvedQuestions.slice(0, 4).map((q) => `- ${q}`));
  }
  lines.push("", scope.scopeNote);
  return enforceExecutionBriefHardCap(lines.join("\n"));
}

function parseIntakeJson(text: string, fallback: BuildIntakeSummary): BuildIntakeSummary {
  const parsed = parseJsonFromModel<{
    app_purpose?: string;
    target_users?: string;
    core_screens?: string[];
    visual_style?: string;
    main_data_entities?: string[];
    must_have_first_version?: string[];
    nice_to_have_later?: string[];
    complex_backend_requirements?: string[];
    unresolved_questions?: string[];
    estimated_complexity?: number;
  }>(text);

  if (!parsed) return fallback;

  return {
    appPurpose: parsed.app_purpose?.trim() || fallback.appPurpose,
    targetUsers: parsed.target_users?.trim() || fallback.targetUsers,
    coreScreens: parsed.core_screens?.length ? parsed.core_screens : fallback.coreScreens,
    visualStyle: parsed.visual_style?.trim() || fallback.visualStyle,
    mainDataEntities: parsed.main_data_entities?.length ? parsed.main_data_entities : fallback.mainDataEntities,
    mustHaveFirstVersionFeatures: parsed.must_have_first_version?.length
      ? parsed.must_have_first_version
      : fallback.mustHaveFirstVersionFeatures,
    niceToHaveLaterFeatures: parsed.nice_to_have_later?.length
      ? parsed.nice_to_have_later
      : fallback.niceToHaveLaterFeatures,
    complexBackendRequirements: parsed.complex_backend_requirements?.length
      ? parsed.complex_backend_requirements
      : fallback.complexBackendRequirements,
    unresolvedQuestions: parsed.unresolved_questions ?? fallback.unresolvedQuestions,
    estimatedComplexity: Math.min(10, Math.max(1, parsed.estimated_complexity ?? fallback.estimatedComplexity)),
    promptTokenEstimate: fallback.promptTokenEstimate,
    compressedTokenEstimate: 0,
  };
}

export function buildIntakeFromPrompt(rawPrompt: string): HugePromptIntakeResult {
  const wasHuge = requiresHugePromptIntake(rawPrompt);
  const fallback = deterministicIntake(rawPrompt);
  const firstPassScope = planFirstPassScope(fallback);
  const executionPlanText = summaryToExecutionPlan(fallback, firstPassScope);
  fallback.compressedTokenEstimate = estimatePromptTokens(executionPlanText);

  return {
    originalPrompt: rawPrompt,
    wasHuge,
    usedCheapModel: false,
    usedChunkedIntake: false,
    summary: fallback,
    executionPlanText,
    executionPlanJson: {
      ...fallback,
      firstPassTier: firstPassScope.tier,
      firstPassTaskCount: firstPassScope.firstPassTaskCount,
      backlogTaskCount: firstPassScope.backlogTaskCount,
    },
    firstPassScope,
    rawPromptSentToHeavyModel: false,
    intakeProviderCostUsd: 0,
  };
}

export async function processHugePromptIntake(input: {
  writer?: SupabaseClient<Database>;
  userId: string;
  userEmail?: string | null;
  projectId: string;
  operationId: string;
  rawPrompt: string;
  userSelectedModelId?: string | null;
}): Promise<HugePromptIntakeResult> {
  const base = buildIntakeFromPrompt(input.rawPrompt);

  if (!input.rawPrompt.trim()) return base;

  let summary = base.summary;
  let usedCheapModel = false;
  let usedChunkedIntake = false;
  let helperModelId: string | undefined;
  let intakeCost = 0;

  if (requiresChunkedIntake(input.rawPrompt)) {
    const chunked = await processChunkedHugePromptIntake({
      writer: input.writer,
      userId: input.userId,
      userEmail: input.userEmail,
      operationId: input.operationId,
      rawPrompt: input.rawPrompt,
      userSelectedModelId: input.userSelectedModelId,
      fallbackSummary: base.summary,
    });
    summary = chunked.summary;
    usedCheapModel = chunked.usedCheapModel;
    usedChunkedIntake = true;
    helperModelId = chunked.helperModelId;
    intakeCost += chunked.costUsd;
  } else if (base.wasHuge && input.writer) {
    try {
      const intakeRes = await callProviderStructured({
        writer: input.writer,
        userId: input.userId,
        userEmail: input.userEmail,
        operationId: `${input.operationId}:intake`,
        operationType: "build_intake",
        system: "You compress huge app specs into structured JSON. No fluff. No duplicated text.",
        prompt: `Analyze this app specification and ${INTAKE_JSON_SCHEMA}\n\n---\n${input.rawPrompt.slice(0, 120000)}\n---`,
        userSelectedModelId: input.userSelectedModelId,
      });
      usedCheapModel = true;
      helperModelId = intakeRes.spec.modelId;
      intakeCost = intakeRes.providerCostUsd;
      summary = parseIntakeJson(intakeRes.text, base.summary);
      summary.promptTokenEstimate = estimatePromptTokens(input.rawPrompt);
    } catch {
      /* deterministic fallback already in base */
    }
  }

  const firstPassScope = planFirstPassScope(summary);
  const executionPlanText = summaryToExecutionPlan(summary, firstPassScope);
  summary.compressedTokenEstimate = estimatePromptTokens(executionPlanText);

  if (!rawPromptBlockedFromHeavyModel(input.rawPrompt, executionPlanText)) {
    throw new Error("Raw prompt leak blocked — execution brief contained raw huge prompt");
  }

  const result: HugePromptIntakeResult = {
    originalPrompt: input.rawPrompt,
    wasHuge: base.wasHuge,
    usedCheapModel,
    usedChunkedIntake,
    summary,
    executionPlanText,
    executionPlanJson: {
      ...summary,
      firstPassTier: firstPassScope.tier,
      firstPassTaskCount: firstPassScope.firstPassTaskCount,
      backlogTaskCount: firstPassScope.backlogTaskCount,
      deferredCount: firstPassScope.deferredFeatures.length,
    },
    firstPassScope,
    rawPromptSentToHeavyModel: false,
    helperModelId,
    intakeProviderCostUsd: intakeCost,
  };

  if (input.writer && input.projectId) {
    await recordMemoryBatch(input.writer, {
      projectId: input.projectId,
      userId: input.userId,
      entries: [
        {
          category: "intent",
          key: ORIGINAL_PROMPT_MEMORY_KEY,
          value: { excerpt: input.rawPrompt.slice(0, 500), length: input.rawPrompt.length },
          importance: 7,
        },
        {
          category: "intent",
          key: ORIGINAL_PROMPT_FULL_MEMORY_KEY,
          value: { text: input.rawPrompt, length: input.rawPrompt.length },
          importance: 8,
        },
        {
          category: "workflow",
          key: BUILD_CONTEXT_MEMORY_KEY,
          value: result.executionPlanJson,
          importance: 9,
        },
      ],
    });

    const backlogItems = backlogItemsFromIntake(input.projectId, summary, firstPassScope);
    if (backlogItems.length) {
      await persistBuildBacklog(input.writer, {
        projectId: input.projectId,
        userId: input.userId,
        items: backlogItems,
      });
    }

    const { data: projRow } = await input.writer
      .from("projects")
      .select("metadata")
      .eq("id", input.projectId)
      .eq("owner_id", input.userId)
      .maybeSingle();
    const existingMeta = (projRow?.metadata ?? {}) as Record<string, unknown>;
    await input.writer
      .from("projects")
      .update({
        metadata: {
          ...existingMeta,
          build_context: result.executionPlanJson,
          build_intake_at: new Date().toISOString(),
          first_pass_tier: firstPassScope.tier,
          original_prompt_length: input.rawPrompt.length,
        },
      } as never)
      .eq("id", input.projectId)
      .eq("owner_id", input.userId);
  }

  return result;
}

/** Prompt text passed to heavy build stages — never the full raw huge prompt. */
export function buildExecutionPromptForHeavyModel(intake: HugePromptIntakeResult): string {
  return intake.executionPlanText;
}

/** Resolve execution brief for heavy model — never pass raw huge prompt. */
export function resolveHeavyExecutionBrief(rawPrompt: string, intake?: HugePromptIntakeResult | null): string {
  if (intake) return buildExecutionPromptForHeavyModel(intake);
  if (requiresHugePromptIntake(rawPrompt)) {
    return buildExecutionPromptForHeavyModel(buildIntakeFromPrompt(rawPrompt));
  }
  return rawPrompt;
}

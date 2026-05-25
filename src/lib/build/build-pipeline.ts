import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import { scoreTaskScope } from "@/lib/ai/task-scope-limiter";
import {
  buildIntakeFromPrompt,
  processHugePromptIntake,
  resolveHeavyExecutionBrief,
  type HugePromptIntakeResult,
} from "@/lib/ai/huge-prompt-intake";
import {
  createBuildContextSlices,
  HeavyInputBudgetTracker,
  type BuildContextSlices,
} from "@/lib/build/heavy-input-budget";
import { loadBuildBacklog } from "@/lib/build/build-backlog";
import {
  formatBuildResultSummary,
  renderBuildResultMarkdown,
} from "@/lib/build/build-continuation-plan";
import { FULL_BUILD_CAP_USD } from "@/lib/ai/cost-budget";
import { callProviderStructured, parseJsonFromModel } from "@/lib/ai/provider-call";
import { parseBuildFilesFromModel } from "@/lib/build/parse-build-files";
import {
  filterRenderableBuildFiles,
  hasRouteFiles,
  type BuildFile,
} from "@/lib/build/generated-file-utils";
import { evaluateBuildSuccessContract } from "@/lib/build/build-success-contract";
import type { BuildSuccessContractResult } from "@/lib/build/build-success-contract";
import { logServerOperation } from "@/lib/ops/server-ops-log";
import { requireId } from "@/lib/diagnostics/require-ids";
import { dreamosLog } from "@/lib/diagnostics/dreamos-logger";
import { createAppIdentityForBuild } from "@/lib/projects/app-identity-service";
import type { BuilderOutputContract } from "@/lib/creation/parse-builder-metadata";
import { slugifyAppName } from "@/lib/creation/parse-builder-metadata";
import { validateGeneratedBuild } from "@/lib/creation/validate-build-quality";
import { assessBuildQuality, buildRepairPrompt } from "@/lib/build/quality-repair";
import {
  classifyAppArchetype,
  archetypeToLegacyAppType,
} from "@/lib/build/app-archetype-classifier";
import { buildDesignBrief, type DesignBrief } from "@/lib/build/design-brief-generator";
import { checkGeneratedUiQuality, previewReadyMinScore } from "@/lib/build/generated-ui-quality-checker";
import { buildPremiumUiRepairPrompt } from "@/lib/build/generated-ui-repair-pass";
import {
  backendPrompt,
  buildPlanPrompt,
  frontendPrompt,
  minimalFrontendPrompt,
  schemaPrompt,
  uiPlanPrompt,
} from "@/lib/build/stage-prompts";

export type WorkflowEventType =
  | "thinking"
  | "classified"
  | "planning"
  | "identity"
  | "icon"
  | "schema"
  | "designing"
  | "reading"
  | "writing"
  | "editing"
  | "validating"
  | "compiling"
  | "repairing"
  | "saving"
  | "charging"
  | "finalizing"
  | "done"
  | "failed";

export type WorkflowEvent = {
  type: WorkflowEventType;
  label: string;
  detail?: string;
  at: string;
};

export type StagedBuildResult = {
  ok: boolean;
  visibleText: string;
  meta: BuilderOutputContract | null;
  iconSvg: string | null;
  iconUrl: string | null;
  appName: string;
  files: BuildFile[];
  events: WorkflowEvent[];
  totalProviderCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  primaryModelId: string;
  complexity: number;
  uiQualityScore: number;
  buildContract: BuildSuccessContractResult;
  errorMessage?: string;
};

type Writer = SupabaseClient<Database>;

const BUILD_SYSTEM = `You are DreamOS86 build engine. Output strict JSON only when asked. Never exceed token limits.`;

function appendWorkflowEvent(
  events: WorkflowEvent[],
  type: WorkflowEventType,
  label: string,
  detail?: string,
  onWorkflowEvent?: (ev: WorkflowEvent) => void | Promise<void>,
) {
  const row: WorkflowEvent = { type, label, detail, at: new Date().toISOString() };
  events.push(row);
  void onWorkflowEvent?.(row);
}

function parseFilePayload(text: string) {
  return parseBuildFilesFromModel(text);
}

function buildVisibleNarrative(
  meta: BuilderOutputContract | null,
  workflow: WorkflowEvent[],
  summary: string,
  savedFiles: BuildFile[],
): string {
  const planSteps = meta?.plan ?? meta?.build_plan?.map((p) => p.title) ?? [];
  const lines: string[] = [];

  lines.push("```dreamos-app-meta");
  lines.push(JSON.stringify(meta ?? { summary }, null, 0));
  lines.push("```");
  lines.push("");

  if (planSteps.length) {
    lines.push("## [planning] Build plan");
    for (const s of planSteps.slice(0, 6)) {
      const label = typeof s === "string" ? s : "Step";
      lines.push(`- ${label}`);
    }
    lines.push("");
  }

  for (const ev of workflow.filter((e) => ["writing", "editing", "validating", "repairing", "saving"].includes(e.type))) {
    lines.push(`- ${ev.label}`);
  }

  if (savedFiles.length > 0) {
    lines.push("");
    lines.push("Files saved:");
    for (const f of savedFiles.slice(0, 14)) {
      lines.push(`- ${f.path}`);
    }
    if (savedFiles.length > 14) lines.push(`- …and ${savedFiles.length - 14} more`);
  }

  lines.push("");
  lines.push(summary.slice(0, 600));

  return lines.join("\n");
}

export async function runStagedBuildPipeline(input: {
  writer: Writer;
  userId: string;
  userEmail: string | null;
  operationId: string;
  projectId: string;
  buildJobId: string | null;
  userPrompt: string;
  memoryBlock?: string;
  blueprintBlock?: string;
  conversationId?: string | null;
  userSelectedModelId?: string | null;
  onWorkflowEvent?: (ev: WorkflowEvent) => void | Promise<void>;
}): Promise<StagedBuildResult> {
  const emit = input.onWorkflowEvent;
  const track = (
    events: WorkflowEvent[],
    type: WorkflowEventType,
    label: string,
    detail?: string,
  ) => appendWorkflowEvent(events, type, label, detail, emit);
  if (!requireId("projectId", input.projectId, { source: "server", userId: input.userId, buildId: input.buildJobId })) {
    dreamosLog({
      source: "server",
      category: "missing_id",
      severity: "error",
      message: "Staged build aborted — missing projectId",
      userId: input.userId,
      buildId: input.buildJobId,
    });
    return {
      ok: false,
      visibleText: "Build failed: project ID is missing.",
      meta: null,
      iconSvg: null,
      files: [],
      events: [],
      totalProviderCostUsd: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      primaryModelId: "automatic",
      complexity: 1,
      errorMessage: "missing_project_id",
      iconUrl: null,
      appName: "Dream App",
      uiQualityScore: 0,
      buildContract: {
        passed: false,
        allowed: false,
        failures: ["missing_project_id"],
        renderableCount: 0,
        pageCount: 0,
        uiQualityScore: 0,
        previewReady: false,
        userMessage: "Build failed.",
      },
    };
  }

  const events: WorkflowEvent[] = [];
  let accumulatedCost = 0;
  let totalIn = 0;
  let totalOut = 0;
  let primaryModelId = "gpt-5.4-mini";

  let intakeResult: HugePromptIntakeResult | null = null;
  try {
    intakeResult = await processHugePromptIntake({
      writer: input.writer,
      userId: input.userId,
      userEmail: input.userEmail,
      projectId: input.projectId,
      operationId: input.operationId,
      rawPrompt: input.userPrompt,
      userSelectedModelId: input.userSelectedModelId,
    });
    accumulatedCost += intakeResult.intakeProviderCostUsd;
  } catch {
    intakeResult = buildIntakeFromPrompt(input.userPrompt);
  }

  const executionPrompt = resolveHeavyExecutionBrief(input.userPrompt, intakeResult);
  const firstPassScope = intakeResult?.firstPassScope;
  const heavyBudget = new HeavyInputBudgetTracker();

  const scope = scoreTaskScope(executionPrompt);
  const effectiveComplexity = firstPassScope?.complexity ?? scope.complexity;
  const effectiveMaxFiles = firstPassScope?.maxFiles ?? scope.maxFiles;

  track(
    events,
    "classified",
    `Complexity ${effectiveComplexity}/10`,
    firstPassScope ? `First pass (${firstPassScope.tier})` : scope.coreV1Only ? "Core V1 first" : undefined,
  );

  const scopeNote = firstPassScope
    ? firstPassScope.scopeNote
    : scope.coreV1Only
      ? `Build Core V1 only. Queue for later: ${scope.backlog.slice(0, 5).join("; ")}`
      : "";

  let contextSlices: BuildContextSlices = createBuildContextSlices(
    executionPrompt,
    scopeNote,
    input.operationId,
  );

  const planContext = [input.blueprintBlock, input.memoryBlock, scopeNote].filter(Boolean).join("\n\n");

  track(events, "planning", "Creating build plan");
  const planPrompt = buildPlanPrompt(executionPrompt, planContext, contextSlices);
  heavyBudget.record([planPrompt, BUILD_SYSTEM]);
  heavyBudget.assertWithinBudget();
  const planRes = await callProviderStructured({
    writer: input.writer,
    userId: input.userId,
    userEmail: input.userEmail,
    operationId: `${input.operationId}:plan`,
    operationType: "build_plan",
    system: BUILD_SYSTEM,
    prompt: planPrompt,
    accumulatedCostUsd: accumulatedCost,
    userSelectedModelId: input.userSelectedModelId,
  });
  accumulatedCost += planRes.providerCostUsd;
  totalIn += planRes.inputTokens ?? 0;
  totalOut += planRes.outputTokens ?? 0;
  primaryModelId = planRes.spec.modelId;

  const planJson = planRes.text;
  contextSlices = createBuildContextSlices(executionPrompt, scopeNote, input.operationId, planJson);
  const planParsed = parseJsonFromModel<{
    complexity?: number;
    summary?: string;
    steps?: string[];
    pages?: string[];
    entities?: string[];
    core_v1_only?: boolean;
    queued_later?: string[];
  }>(planJson);

  const complexity = Math.min(10, planParsed?.complexity ?? effectiveComplexity);

  track(events, "identity", "Creating app identity");
  const identityResult = await createAppIdentityForBuild({
    writer: input.writer,
    userId: input.userId,
    userEmail: input.userEmail,
    projectId: input.projectId,
    buildOperationId: input.operationId,
    buildIntent: executionPrompt,
    planSummary: planParsed?.summary ?? planJson.slice(0, 800),
    categoryHint: planParsed?.entities?.[0] ? String(planParsed.entities[0]) : undefined,
    userSelectedModelId: input.userSelectedModelId,
    onProgress: (step) => track(events, "identity", step),
  });

  const appName = identityResult.appName;
  const appSlug = identityResult.slug;
  const category = identityResult.category;
  let iconSvg = identityResult.iconSvg;
  if (identityResult.userNotice) {
    track(events, "icon", identityResult.userNotice);
  }

  track(events, "classified", "Detecting app archetype");
  const archetype = classifyAppArchetype(executionPrompt);
  const designBrief: DesignBrief = buildDesignBrief({
    buildIntent: executionPrompt,
    archetype,
    appName,
    planSummary: planParsed?.summary,
    planPages: planParsed?.pages?.map(String),
  });
  track(events, "designing", "Creating design brief");

  const { data: projMetaRow } = await input.writer
    .from("projects")
    .select("metadata")
    .eq("id", input.projectId)
    .maybeSingle();
  const prevMeta =
    projMetaRow?.metadata && typeof projMetaRow.metadata === "object" && !Array.isArray(projMetaRow.metadata)
      ? (projMetaRow.metadata as Record<string, unknown>)
      : {};
  await input.writer
    .from("projects")
    .update({
      metadata: {
        ...prevMeta,
        app_archetype: archetype.id,
        app_type: archetypeToLegacyAppType(archetype.id),
        design_brief_routes: designBrief.routes,
        blueprint_routes: designBrief.routes,
      } as Json,
    } as never)
    .eq("id", input.projectId)
    .eq("owner_id", input.userId);

  track(events, "schema", "Designing data schema");
  const schemaPromptText = schemaPrompt(planJson, contextSlices);
  heavyBudget.record([schemaPromptText, BUILD_SYSTEM]);
  const schemaRes = await callProviderStructured({
    writer: input.writer,
    userId: input.userId,
    userEmail: input.userEmail,
    operationId: `${input.operationId}:schema`,
    operationType: "schema_design",
    system: BUILD_SYSTEM,
    prompt: schemaPromptText,
    complexity,
    accumulatedCostUsd: accumulatedCost,
  });
  accumulatedCost += schemaRes.providerCostUsd;
  const schemaJson = schemaRes.text;
  contextSlices = createBuildContextSlices(
    executionPrompt,
    scopeNote,
    input.operationId,
    planJson,
    schemaJson,
  );

  track(events, "designing", "Planning UI structure");
  const uiPromptText = uiPlanPrompt(planJson, schemaJson, executionPrompt, contextSlices, designBrief);
  heavyBudget.record([uiPromptText, BUILD_SYSTEM]);
  const uiRes = await callProviderStructured({
    writer: input.writer,
    userId: input.userId,
    userEmail: input.userEmail,
    operationId: `${input.operationId}:ui`,
    operationType: "ui_design_plan",
    system: BUILD_SYSTEM,
    prompt: uiPromptText,
    complexity,
    accumulatedCostUsd: accumulatedCost,
    userSelectedModelId: input.userSelectedModelId,
  });
  accumulatedCost += uiRes.providerCostUsd;
  const uiJson = uiRes.text;
  contextSlices = createBuildContextSlices(
    executionPrompt,
    scopeNote,
    input.operationId,
    planJson,
    schemaJson,
    uiJson,
  );

  if (accumulatedCost >= FULL_BUILD_CAP_USD * 0.85) {
    return {
      ok: false,
      visibleText: "This build is too large for one pass. I staged the core plan — continue with a follow-up prompt for the next features.",
      meta: null,
      iconSvg: iconSvg || null,
      iconUrl: identityResult.iconUrl,
      appName,
      files: [],
      events,
      totalProviderCostUsd: accumulatedCost,
      totalInputTokens: totalIn,
      totalOutputTokens: totalOut,
      primaryModelId,
      complexity,
      uiQualityScore: 0,
      buildContract: {
        passed: false,
        allowed: false,
        failures: ["build_budget_precheck"],
        renderableCount: 0,
        pageCount: 0,
        uiQualityScore: 0,
        previewReady: false,
        userMessage: "Build needs repair — credits were returned.",
      },
      errorMessage: "build_budget_precheck",
    };
  }

  track(events, "writing", "Generating frontend files");
  const smokeBuild = process.env.DREAMOS_SMOKE_BUILD === "1";
  const fePrompt = smokeBuild
    ? minimalFrontendPrompt(executionPrompt, planJson, contextSlices, designBrief)
    : frontendPrompt(executionPrompt, planJson, uiJson, effectiveMaxFiles, contextSlices, designBrief);
  heavyBudget.record([fePrompt, BUILD_SYSTEM]);
  heavyBudget.assertWithinBudget(true);
  const feRes = await callProviderStructured({
    writer: input.writer,
    userId: input.userId,
    userEmail: input.userEmail,
    operationId: `${input.operationId}:frontend`,
    operationType: "frontend_implementation",
    system: BUILD_SYSTEM,
    prompt: fePrompt,
    complexity: smokeBuild ? 3 : complexity,
    accumulatedCostUsd: accumulatedCost,
    userSelectedModelId: input.userSelectedModelId,
  });
  accumulatedCost += feRes.providerCostUsd;
  totalIn += feRes.inputTokens ?? 0;
  totalOut += feRes.outputTokens ?? 0;
  primaryModelId = feRes.spec.modelId;

  let allFiles: BuildFile[] = [];
  const fePayload = parseFilePayload(feRes.text);
  if (fePayload.files.length) {
    allFiles = filterRenderableBuildFiles(fePayload.files).slice(0, effectiveMaxFiles);
    for (const ev of fePayload.events.slice(0, 12)) {
      track(events, "writing", ev.summary || `Wrote ${ev.path}`, ev.path);
    }
  }

  if (!hasRouteFiles(allFiles) && accumulatedCost < FULL_BUILD_CAP_USD * 0.92) {
    track(events, "writing", "Retrying with compact route set");
    const miniRes = await callProviderStructured({
      writer: input.writer,
      userId: input.userId,
      userEmail: input.userEmail,
      operationId: `${input.operationId}:frontend-mini`,
      operationType: "frontend_implementation",
      system: BUILD_SYSTEM,
      prompt: minimalFrontendPrompt(executionPrompt, planJson, contextSlices, designBrief),
      complexity: 4,
      accumulatedCostUsd: accumulatedCost,
      userSelectedModelId: input.userSelectedModelId,
    });
    accumulatedCost += miniRes.providerCostUsd;
    const miniPayload = parseFilePayload(miniRes.text);
    if (miniPayload.files.length) {
      const merged = new Map(allFiles.map((f) => [f.path, f]));
      for (const f of filterRenderableBuildFiles(miniPayload.files)) merged.set(f.path, f);
      allFiles = [...merged.values()].slice(0, effectiveMaxFiles);
    }
  }

  allFiles = filterRenderableBuildFiles(allFiles);

  const allowBackend =
    (firstPassScope?.includeBackend ?? complexity >= 7) &&
    hasRouteFiles(allFiles) &&
    accumulatedCost < FULL_BUILD_CAP_USD * 0.9;

  if (allowBackend) {
    track(events, "writing", "Generating backend files");
    try {
      const beRes = await callProviderStructured({
        writer: input.writer,
        userId: input.userId,
        userEmail: input.userEmail,
        operationId: `${input.operationId}:backend`,
        operationType: "backend_implementation",
        system: BUILD_SYSTEM,
        prompt: backendPrompt(planJson, schemaJson, contextSlices),
        complexity,
        accumulatedCostUsd: accumulatedCost,
        userSelectedModelId: input.userSelectedModelId,
      });
      accumulatedCost += beRes.providerCostUsd;
      const bePayload = parseFilePayload(beRes.text);
      if (bePayload.files.length) {
        const merged = new Map(allFiles.map((f) => [f.path, f]));
        for (const f of filterRenderableBuildFiles(bePayload.files)) merged.set(f.path, f);
        allFiles = [...merged.values()].slice(0, effectiveMaxFiles);
      }
    } catch {
      /* backend optional */
    }
  }

  track(events, "validating", `Validating ${allFiles.length} files`);
  let quality = assessBuildQuality(allFiles);
  let repairAttempts = 0;

  let uiQuality = checkGeneratedUiQuality({
    files: allFiles,
    appType: archetypeToLegacyAppType(archetype.id),
    routeMap: designBrief.routes,
  });

  while (
    (!quality.ok || !uiQuality.passesPreview) &&
    repairAttempts < 3 &&
    accumulatedCost < FULL_BUILD_CAP_USD
  ) {
    const repairLabel = uiQuality.basicUiFailure
      ? `Premium UI repair ${repairAttempts + 1} (score ${uiQuality.score}/${previewReadyMinScore()})`
      : `Repair pass ${repairAttempts + 1}`;
    track(events, "repairing", repairLabel);
    const repairPrompt = uiQuality.basicUiFailure || uiQuality.score < previewReadyMinScore()
      ? buildPremiumUiRepairPrompt({
          designBrief,
          quality: uiQuality,
          files: allFiles,
          userPrompt: executionPrompt,
        })
      : buildRepairPrompt(quality.reasons, allFiles, executionPrompt);
    const repairRes = await callProviderStructured({
      writer: input.writer,
      userId: input.userId,
      userEmail: input.userEmail,
      operationId: `${input.operationId}:ui-repair:${repairAttempts}`,
      operationType: repairAttempts === 0 ? "code_repair_small" : "code_repair_hard",
      system: BUILD_SYSTEM,
      prompt: repairPrompt,
      complexity,
      accumulatedCostUsd: accumulatedCost,
      userSelectedModelId: input.userSelectedModelId,
    });
    accumulatedCost += repairRes.providerCostUsd;
    const repaired = parseFilePayload(repairRes.text);
    if (repaired.files.length) {
      const merged = new Map(allFiles.map((f) => [f.path, f]));
      for (const f of filterRenderableBuildFiles(repaired.files)) merged.set(f.path, f);
      allFiles = filterRenderableBuildFiles([...merged.values()]);
    }
    quality = assessBuildQuality(allFiles);
    uiQuality = checkGeneratedUiQuality({
      files: allFiles,
      appType: archetypeToLegacyAppType(archetype.id),
      routeMap: designBrief.routes,
    });
    repairAttempts += 1;
  }

  track(events, "compiling", "Preview compile check");
  const fileQuality = validateGeneratedBuild(allFiles);

  const { data: projAfterIdentity } = await input.writer
    .from("projects")
    .select("app_name, icon_url, icon_svg")
    .eq("id", input.projectId)
    .maybeSingle();

  const resolvedAppName = projAfterIdentity?.app_name?.trim() || appName;
  const hasIcon = Boolean(
    identityResult.iconUrl ||
      projAfterIdentity?.icon_url ||
      (identityResult.iconSvg && identityResult.iconSvg.startsWith("<svg")) ||
      projAfterIdentity?.icon_svg,
  );

  const buildContract = evaluateBuildSuccessContract({
    files: allFiles,
    uiQuality,
    appName: resolvedAppName,
    hasIcon,
  });

  const ok = buildContract.passed;
  const summaryText = buildContract.userMessage;

  const meta: BuilderOutputContract = {
    app: {
      name: appName,
      slug: appSlug,
      description: identityResult.shortDescription || planParsed?.summary || "",
      category,
      theme: undefined,
    },
    build_plan: (planParsed?.steps ?? []).slice(0, 6).map((title, i) => ({
      id: `step-${i}`,
      title: String(title),
      summary: "",
    })),
    plan: planParsed?.steps ?? [],
    pages: (planParsed?.pages ?? []).map((p) => ({ id: slugifyAppName(String(p)), title: String(p) })),
    entities: [],
    files: allFiles.map((f) => ({ path: f.path, action: "created" as const })),
    summary: ok
      ? `Built ${resolvedAppName} with ${allFiles.length} files. Your first version is ready.`
      : summaryText,
    dashboard: undefined,
    publish: undefined,
    preview: undefined,
    steps: [],
  };

  let resultMarkdown = "";
  if (intakeResult && ok) {
    const backlog = await loadBuildBacklog(input.writer, input.projectId);
    const resultSummary = formatBuildResultSummary({
      appName,
      scope: intakeResult.firstPassScope,
      intake: intakeResult.summary,
      backlog,
      builtScreens: planParsed?.pages?.map(String),
    });
    resultMarkdown = renderBuildResultMarkdown(resultSummary);
    meta.summary = resultSummary.headline;
  } else if (scope.coreV1Only && scope.backlog.length) {
    meta.summary = `${meta.summary} Remaining items are queued as next steps.`;
  }

  const summary = meta.summary ?? "";
  if (ok) track(events, "done", summary);
  else track(events, "failed", buildContract.failures.slice(0, 3).join("; ") || summaryText);

  if (input.buildJobId) {
    const pipelineMeta = {
      pipeline: "staged",
      complexity,
      provider_cost_usd: accumulatedCost,
      workflow_events: events as unknown as Json,
      ui_quality_score: uiQuality.score,
      ui_preview_ready: buildContract.previewReady,
      build_success_contract: buildContract.passed,
      build_contract_failures: buildContract.failures,
      app_archetype: archetype.id,
    } as Json;
    const { error: metaErr } = await input.writer
      .from("build_jobs")
      .update({ meta: pipelineMeta } as never)
      .eq("id", input.buildJobId);
    if (metaErr?.message?.includes("meta")) {
      await input.writer
        .from("build_jobs")
        .update({ metadata: pipelineMeta } as never)
        .eq("id", input.buildJobId);
    }
  }

  await logServerOperation({
    writer: input.writer,
    userId: input.userId,
    userEmail: input.userEmail,
    stage: "build",
    event: ok ? "build_pipeline_success" : "build_pipeline_failed",
    status: ok ? "ok" : "error",
    mode: "build",
    modelId: primaryModelId,
    projectId: input.projectId,
    buildJobId: input.buildJobId,
    operationId: input.operationId,
    errorMessage: ok
      ? null
      : buildContract.failures.join("; ") || summaryText || "build_contract_failed",
    metadata: {
      files: allFiles.length,
      renderable: buildContract.renderableCount,
      contract_passed: buildContract.passed,
      provider_cost_usd: accumulatedCost,
      output_tokens: totalOut,
    },
  });

  return {
    ok,
    visibleText: resultMarkdown
      ? `${buildVisibleNarrative(meta, events, summary, allFiles)}\n\n${resultMarkdown}`
      : buildVisibleNarrative(meta, events, summary, allFiles),
    meta,
    iconSvg: iconSvg || null,
    iconUrl: identityResult.iconUrl,
    appName: resolvedAppName,
    files: allFiles,
    events,
    totalProviderCostUsd: accumulatedCost,
    totalInputTokens: totalIn,
    totalOutputTokens: totalOut,
    primaryModelId,
    complexity,
    uiQualityScore: uiQuality.score,
    buildContract,
    errorMessage: ok ? undefined : buildContract.failures.join("; ") || summaryText,
  };
}

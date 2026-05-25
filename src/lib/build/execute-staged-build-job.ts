import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import { runStagedBuildPipeline } from "@/lib/build/build-pipeline";
import { calculateCreditsForStagedBuild } from "@/lib/credits/credit-pricing";
import { reconcileGenerationReservation } from "@/lib/billing/credit-reservations";
import { assertProfitableCharge } from "@/lib/billing/credit-profit-guard";
import { finalizeBuildSuccess, finalizeBuildFailed } from "@/lib/build/finalize-build";
import { completeBuildWithValidation } from "@/lib/build/complete-build-with-validation";
import { getAppUrl } from "@/lib/app-url";
import { hasSuccessfulChargeForOperation } from "@/lib/chat/server-idempotency";
import { persistGeneratedBuildFiles } from "@/lib/build/persist-generated-files";
import { MIN_RENDERABLE_FILES } from "@/lib/build/build-success-contract";
import { lifecyclePatch } from "@/lib/projects/project-lifecycle";
import {
  persistBuildJobEvent,
  persistWorkflowEvent,
} from "@/lib/build/build-job-events";
import { logServerOperation } from "@/lib/ops/server-ops-log";
import { normalizeBuildError } from "@/lib/build/build-error";

type Writer = SupabaseClient<Database>;

export type ExecuteStagedBuildJobInput = {
  writer: Writer;
  userId: string;
  userEmail: string;
  operationId: string;
  projectId: string;
  buildJobId: string;
  userPrompt: string;
  memoryBlock: string;
  conversationId?: string;
  modelId: string;
  reservedCredits?: number;
  blueprintBlock?: string;
  userSelectedModelId?: string | null;
};

async function refundBuildReservation(input: {
  writer: Writer;
  userId: string;
  operationId: string;
  reservedCredits?: number;
  providerCostUsd: number;
  projectId: string;
  buildJobId: string;
}) {
  if (!input.reservedCredits || input.reservedCredits <= 0) return;
  await reconcileGenerationReservation(input.writer, {
    userId: input.userId,
    generationId: input.operationId,
    reservedCredits: input.reservedCredits,
    actualUserCredits: 0,
    providerCostUsd: input.providerCostUsd,
    success: false,
    projectId: input.projectId,
  });
  await persistBuildJobEvent(input.writer, {
    jobId: input.buildJobId,
    projectId: input.projectId,
    userId: input.userId,
    type: "refunded",
    title: "Credits returned",
    detail: "Build did not pass quality checks — reserved credits were returned.",
    progressPercent: 100,
  });
}

/** Runs staged build in background after /api/chat returns. */
export async function executeStagedBuildJob(input: ExecuteStagedBuildJobInput): Promise<void> {
  const eventCtx = {
    jobId: input.buildJobId,
    projectId: input.projectId,
    userId: input.userId,
  };

  let stepIndex = 0;
  const progressForStep = () => Math.min(95, 8 + stepIndex++ * 6);

  try {
    await persistBuildJobEvent(input.writer, {
      ...eventCtx,
      type: "planning_app",
      title: "Creating the app plan",
      detail: "Organizing screens and features",
      progressPercent: 10,
    });

    const pr = await runStagedBuildPipeline({
      writer: input.writer,
      userId: input.userId,
      userEmail: input.userEmail,
      operationId: input.operationId,
      projectId: input.projectId,
      buildJobId: input.buildJobId,
      userPrompt: input.userPrompt,
      memoryBlock: input.memoryBlock,
      blueprintBlock: input.blueprintBlock,
      conversationId: input.conversationId,
      userSelectedModelId: input.userSelectedModelId ?? input.modelId,
      onWorkflowEvent: async (ev) => {
        await persistWorkflowEvent(input.writer, eventCtx, ev, progressForStep());
      },
    });

    const alreadyCharged = await hasSuccessfulChargeForOperation(
      input.writer,
      input.userId,
      input.operationId,
    );

    if (input.conversationId && pr.visibleText) {
      await input.writer.from("messages").insert({
        conversation_id: input.conversationId,
        user_id: input.userId,
        role: "assistant",
        content: pr.visibleText,
        model_id: pr.primaryModelId,
        credits_used: 0,
        finish_reason: pr.ok ? "stop" : "error",
        tokens_input: pr.totalInputTokens,
        tokens_output: pr.totalOutputTokens,
        metadata: {
          mode: "build",
          staged: true,
          async: true,
          build_success: pr.ok,
          build_job_id: input.buildJobId,
        } as never,
      });
    }

    const persist = await persistGeneratedBuildFiles({
      writer: input.writer,
      projectId: input.projectId,
      ownerId: input.userId,
      files: pr.files,
    });

    await persistBuildJobEvent(input.writer, {
      ...eventCtx,
      type: "saving_files",
      title: "Saving files",
      detail: `${persist.savedCount} files saved`,
      progressPercent: 88,
    });

    const buildSucceeded =
      pr.ok &&
      pr.buildContract.passed &&
      persist.ok &&
      persist.savedCount >= MIN_RENDERABLE_FILES;

    if (!buildSucceeded) {
      await refundBuildReservation({
        writer: input.writer,
        userId: input.userId,
        operationId: input.operationId,
        reservedCredits: input.reservedCredits,
        providerCostUsd: pr.totalProviderCostUsd,
        projectId: input.projectId,
        buildJobId: input.buildJobId,
      });

      const { data: cur } = await input.writer
        .from("projects")
        .select("metadata")
        .eq("id", input.projectId)
        .maybeSingle();
      const prevMeta =
        cur?.metadata && typeof cur.metadata === "object" && !Array.isArray(cur.metadata)
          ? (cur.metadata as Record<string, unknown>)
          : {};

      await input.writer
        .from("projects")
        .update({
          build_status: "needs_repair",
          metadata: {
            ...prevMeta,
            ...lifecyclePatch("needs_attention", {
              build_contract_failures: pr.buildContract.failures,
              credits_refunded: true,
            }),
            file_count: persist.savedCount,
            ui_quality_score: pr.uiQualityScore,
          } as Json,
        } as never)
        .eq("id", input.projectId)
        .eq("owner_id", input.userId);

      await finalizeBuildFailed({
        writer: input.writer,
        buildJobId: input.buildJobId,
        projectId: input.projectId,
        userId: input.userId,
        errorMessage: pr.buildContract.userMessage,
      });

      await persistBuildJobEvent(input.writer, {
        ...eventCtx,
        type: "failed",
        title: "Build needs repair",
        detail: pr.buildContract.userMessage,
        progressPercent: 100,
        metadata: { failures: pr.buildContract.failures },
      });

      await logServerOperation({
        writer: input.writer,
        userId: input.userId,
        userEmail: input.userEmail,
        stage: "build",
        event: "async_build_failed",
        status: "error",
        mode: "build",
        modelId: pr.primaryModelId,
        projectId: input.projectId,
        buildJobId: input.buildJobId,
        operationId: input.operationId,
        errorMessage: pr.errorMessage ?? pr.buildContract.userMessage,
        metadata: { failures: pr.buildContract.failures },
      });
      return;
    }

    const iconApiUrl =
      pr.iconUrl ?? `${getAppUrl().replace(/\/$/, "")}/api/projects/${input.projectId}/icon`;

    await input.writer
      .from("projects")
      .update({
        app_icon_url: pr.iconSvg,
        icon_url: pr.iconUrl ?? iconApiUrl,
        app_name: pr.appName.slice(0, 80),
      } as never)
      .eq("id", input.projectId)
      .eq("owner_id", input.userId);

    await finalizeBuildSuccess({
      writer: input.writer,
      userId: input.userId,
      projectId: input.projectId,
      buildJobId: input.buildJobId,
      appName: pr.appName,
      appSlug: pr.meta?.app?.slug ?? null,
      appDescription: pr.meta?.app?.description ?? null,
      iconSvg: pr.iconSvg,
      meta: pr.meta,
      fileCount: persist.savedCount,
      creditsCharged: 0,
      charged: false,
    });

    await completeBuildWithValidation({
      writer: input.writer,
      userId: input.userId,
      projectId: input.projectId,
    });

    let creditsCharged = 0;
    if (!alreadyCharged && input.reservedCredits && input.reservedCredits > 0) {
      const chargeCalc = calculateCreditsForStagedBuild({
        providerCostUsd: pr.totalProviderCostUsd,
        complexity: pr.complexity,
        inputTokens: pr.totalInputTokens,
        outputTokens: pr.totalOutputTokens,
        primaryModelId: pr.primaryModelId,
        fileCount: persist.savedCount,
      });

      const profitable = assertProfitableCharge(
        chargeCalc.creditsToCharge,
        chargeCalc.estimatedProviderCostUsd,
      );

      if (profitable.ok) {
        const recon = await reconcileGenerationReservation(input.writer, {
          userId: input.userId,
          generationId: input.operationId,
          reservedCredits: input.reservedCredits,
          actualUserCredits: Math.min(input.reservedCredits, chargeCalc.creditsToCharge),
          providerCostUsd: chargeCalc.estimatedProviderCostUsd,
          success: true,
          projectId: input.projectId,
        });
        creditsCharged = recon.finalCharged;

        await finalizeBuildSuccess({
          writer: input.writer,
          userId: input.userId,
          projectId: input.projectId,
          buildJobId: input.buildJobId,
          appName: pr.appName,
          appSlug: pr.meta?.app?.slug ?? null,
          appDescription: pr.meta?.app?.description ?? null,
          iconSvg: pr.iconSvg,
          meta: pr.meta,
          fileCount: persist.savedCount,
          creditsCharged: recon.finalCharged,
          charged: true,
        });
      }
    }

    await persistBuildJobEvent(input.writer, {
      ...eventCtx,
      type: "completed",
      title: "Preview ready",
      detail: pr.meta?.summary ?? `Built ${pr.appName}`,
      progressPercent: 100,
      metadata: { credits_charged: creditsCharged },
    });

    await logServerOperation({
      writer: input.writer,
      userId: input.userId,
      userEmail: input.userEmail,
      stage: "build",
      event: "async_build_success",
      status: "ok",
      mode: "build",
      modelId: pr.primaryModelId,
      projectId: input.projectId,
      buildJobId: input.buildJobId,
      operationId: input.operationId,
      metadata: { files: persist.savedCount, credits_charged: creditsCharged },
    });
  } catch (err) {
    const normalized = normalizeBuildError(err, {
      stage: "build_pipeline",
      operationId: input.operationId,
      projectId: input.projectId,
      mode: "build",
      modelId: input.modelId,
    });

    await refundBuildReservation({
      writer: input.writer,
      userId: input.userId,
      operationId: input.operationId,
      reservedCredits: input.reservedCredits,
      providerCostUsd: 0,
      projectId: input.projectId,
      buildJobId: input.buildJobId,
    }).catch(() => undefined);

    await finalizeBuildFailed({
      writer: input.writer,
      buildJobId: input.buildJobId,
      projectId: input.projectId,
      userId: input.userId,
      errorMessage: normalized.userMessage,
    }).catch(() => undefined);

    await persistBuildJobEvent(input.writer, {
      ...eventCtx,
      type: "failed",
      title: "Build failed",
      detail: normalized.userMessage,
      progressPercent: 100,
      metadata: { code: normalized.code, retryable: normalized.retryable },
    });

    await logServerOperation({
      writer: input.writer,
      userId: input.userId,
      userEmail: input.userEmail,
      stage: "build",
      event: "async_build_crash",
      status: "error",
      mode: "build",
      modelId: input.modelId,
      projectId: input.projectId,
      buildJobId: input.buildJobId,
      operationId: input.operationId,
      errorMessage: normalized.message,
      metadata: { code: normalized.code, stage: normalized.stage },
    });
  }
}

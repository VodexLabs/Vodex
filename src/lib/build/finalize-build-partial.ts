import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import type { BuilderOutputContract } from "@/lib/creation/parse-builder-metadata";
import { refineAppName } from "@/lib/projects/project-context";
import { lifecyclePatch } from "@/lib/projects/project-lifecycle";
import { persistBuildJobEvent } from "@/lib/build/build-job-events";
import { transitionBuildJobStatus } from "@/lib/build/build-job-terminal";
import type { BuildWorkerContext } from "@/lib/build/build-job-terminal";

type Writer = SupabaseClient<Database>;

export type FinalizePartialBuildInput = {
  writer: Writer;
  userId: string;
  projectId: string;
  buildJobId: string;
  workerCtx: BuildWorkerContext;
  appName: string;
  meta: BuilderOutputContract | null;
  fileCount: number;
  creditsUsed: number;
  remainingSummary?: string;
  skipJobStatusUpdate?: boolean;
};

/** Saved progress when build credits ran out before full scope completed. */
export async function finalizeBuildPartial(input: FinalizePartialBuildInput): Promise<void> {
  const now = new Date().toISOString();
  const appName = refineAppName(input.appName, input.meta?.app?.description ?? "");

  if (!input.skipJobStatusUpdate) {
    await input.writer
      .from("build_jobs")
      .update({
        status: "completed",
        completed_at: now,
        error_message: null,
        result_summary: `Partial build — ${input.fileCount} file(s), needs more credits`,
        credits_charged: input.creditsUsed,
      } as never)
      .eq("id", input.buildJobId);
  }

  const { data: curProj } = await input.writer
    .from("projects")
    .select("name, metadata")
    .eq("id", input.projectId)
    .maybeSingle();

  const prevMeta =
    curProj?.metadata && typeof curProj.metadata === "object" && !Array.isArray(curProj.metadata)
      ? (curProj.metadata as Record<string, unknown>)
      : {};

  const buildMeta = {
    ...prevMeta,
    ...lifecyclePatch("needs_attention", {
      build_status: "partial_needs_more_credits",
      partial_build: true,
      partial_credits_used: input.creditsUsed,
      partial_summary: input.remainingSummary ?? "Additional build steps are queued for your next credits.",
      file_count: input.fileCount,
      shell_only: false,
      hide_from_list: false,
      last_build_at: now,
      last_build_id: input.buildJobId,
    }),
    app_name: appName,
    file_count: input.fileCount,
    builder: {
      ...(typeof prevMeta.builder === "object" && prevMeta.builder ? prevMeta.builder : {}),
      app: input.meta?.app ?? { name: appName },
      pages: input.meta?.pages ?? [],
      summary: input.remainingSummary ?? input.meta?.summary ?? null,
      updated_at: now,
    },
  };

  const curName = curProj?.name?.trim() ?? "";
  const shouldRename =
    Boolean(appName) && (!curName || /^new app$/i.test(curName) || /^new build$/i.test(curName));

  await input.writer
    .from("projects")
    .update({
      name: shouldRename ? appName.slice(0, 80) : curName || appName.slice(0, 80),
      build_status: "partial",
      metadata: buildMeta as Json,
    } as never)
    .eq("id", input.projectId)
    .eq("owner_id", input.userId);

  await transitionBuildJobStatus(input.writer, {
    jobId: input.buildJobId,
    ctx: input.workerCtx,
    toStatus: "completed",
    reason: "partial_needs_more_credits",
  });

  await persistBuildJobEvent(input.writer, {
    jobId: input.buildJobId,
    projectId: input.projectId,
    userId: input.userId,
    type: "partial_credit_stop",
    title: "Saved partial progress",
    detail: input.remainingSummary ?? "Add credits to continue the remaining steps.",
    progressPercent: 100,
    metadata: {
      credits_used: input.creditsUsed,
      file_count: input.fileCount,
      terminal: "partial_needs_more_credits",
    },
  });
}

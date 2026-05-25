import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import type { WorkflowEvent, WorkflowEventType } from "@/lib/build/build-pipeline";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export type BuildJobEventType =
  | "queued"
  | "understanding_request"
  | "planning_app"
  | "generating_app_identity"
  | "generating_app_icon"
  | "writing_file"
  | "editing_file"
  | "checking_file"
  | "fixing_error"
  | "validating_preview"
  | "saving_files"
  | "preparing_preview"
  | "completed"
  | "failed"
  | "refunded";

export type BuildJobEventRow = {
  id: string;
  created_at: string;
  job_id: string;
  project_id: string;
  user_id: string;
  type: BuildJobEventType;
  title: string;
  detail: string | null;
  file_path: string | null;
  progress_percent: number | null;
  metadata: Record<string, unknown>;
};

type Writer = SupabaseClient<Database>;

const WORKFLOW_TO_JOB: Partial<Record<WorkflowEventType, BuildJobEventType>> = {
  thinking: "understanding_request",
  classified: "understanding_request",
  planning: "planning_app",
  identity: "generating_app_identity",
  icon: "generating_app_icon",
  schema: "planning_app",
  designing: "planning_app",
  reading: "checking_file",
  writing: "writing_file",
  editing: "editing_file",
  validating: "checking_file",
  compiling: "validating_preview",
  repairing: "fixing_error",
  saving: "saving_files",
  charging: "preparing_preview",
  finalizing: "preparing_preview",
  done: "completed",
  failed: "failed",
};

function extractFilePath(detail?: string): string | null {
  if (!detail) return null;
  const m = detail.match(/(?:^|\s)([\w./-]+\.(?:tsx|jsx|ts|js|css|json))(?:\s|$)/i);
  return m?.[1] ?? null;
}

export function mapWorkflowEventToJobType(type: WorkflowEventType): BuildJobEventType {
  return WORKFLOW_TO_JOB[type] ?? "understanding_request";
}

export function userTitleForJobEvent(type: BuildJobEventType, label: string): string {
  const map: Partial<Record<BuildJobEventType, string>> = {
    queued: "Queued",
    understanding_request: "Understanding your app",
    planning_app: "Creating the app plan",
    generating_app_identity: "Generating a name and icon",
    generating_app_icon: "Generating app icon",
    writing_file: "Writing files",
    editing_file: "Editing files",
    checking_file: "Checking files",
    fixing_error: "Applying repair pass",
    validating_preview: "Checking preview",
    saving_files: "Saving files",
    preparing_preview: "Preparing preview",
    completed: "Preview ready",
    failed: "Build needs repair",
    refunded: "Credits returned",
  };
  return map[type] ?? label;
}

export async function persistBuildJobEvent(
  writer: Writer,
  input: {
    jobId: string;
    projectId: string;
    userId: string;
    type: BuildJobEventType;
    title: string;
    detail?: string | null;
    filePath?: string | null;
    progressPercent?: number | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const row = {
    job_id: input.jobId,
    project_id: input.projectId,
    user_id: input.userId,
    type: input.type,
    title: input.title,
    detail: input.detail ?? null,
    file_path: input.filePath ?? null,
    progress_percent: input.progressPercent ?? null,
    metadata: (input.metadata ?? {}) as Json,
  };

  const admin = createServiceRoleClient();
  const db = admin ?? writer;
  const { error } = await db.from("build_job_events").insert(row as never);
  if (error && process.env.NODE_ENV !== "production") {
    const msg = error.message ?? "";
    if (!msg.includes("build_job_events") || !msg.includes("does not exist")) {
      console.warn("[build-events] persist failed:", msg);
    }
  }
}

export async function persistWorkflowEvent(
  writer: Writer,
  ctx: { jobId: string; projectId: string; userId: string },
  ev: WorkflowEvent,
  progressPercent?: number,
): Promise<void> {
  const type = mapWorkflowEventToJobType(ev.type);
  const filePath = extractFilePath(ev.detail) ?? extractFilePath(ev.label);
  await persistBuildJobEvent(writer, {
    jobId: ctx.jobId,
    projectId: ctx.projectId,
    userId: ctx.userId,
    type,
    title: userTitleForJobEvent(type, ev.label),
    detail: ev.detail ?? ev.label,
    filePath,
    progressPercent,
  });
}

export async function emitInitialBuildEvents(
  writer: Writer,
  ctx: { jobId: string; projectId: string; userId: string },
): Promise<void> {
  await persistBuildJobEvent(writer, {
    ...ctx,
    type: "queued",
    title: "Queued",
    detail: "Starting your build…",
    progressPercent: 2,
  });
  await persistBuildJobEvent(writer, {
    ...ctx,
    type: "understanding_request",
    title: "Understanding your app",
    detail: "Learning what you want to build",
    progressPercent: 5,
  });
}

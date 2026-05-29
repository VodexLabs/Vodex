import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import type { WorkflowEvent, WorkflowEventType } from "@/lib/build/build-pipeline";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  isBuildEventsSchemaError,
  logBuildEventsSetupWarningOnce,
  markBuildJobEventsTableMissing,
} from "@/lib/build/build-events-schema-health";

export type BuildJobEventType =
  | "job_created"
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
  | "partial_credit_stop"
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
  failed: "fixing_error",
};

function extractFilePath(detail?: string): string | null {
  if (!detail) return null;
  const m = detail.match(/(?:^|\s)([\w./-]+\.(?:tsx|jsx|ts|js|css|json))(?:\s|$)/i);
  return m?.[1] ?? null;
}

export function mapWorkflowEventToJobType(type: WorkflowEventType): BuildJobEventType {
  return WORKFLOW_TO_JOB[type] ?? "understanding_request";
}

const EVENT_PROGRESS_FLOOR: Partial<Record<BuildJobEventType, number>> = {
  job_created: 1,
  queued: 2,
  understanding_request: 5,
  planning_app: 12,
  generating_app_identity: 18,
  generating_app_icon: 20,
  writing_file: 25,
  editing_file: 35,
  checking_file: 45,
  fixing_error: 50,
  saving_files: 65,
  validating_preview: 75,
  preparing_preview: 90,
  completed: 100,
  partial_credit_stop: 100,
  failed: 100,
};

export function defaultProgressForEventType(type: BuildJobEventType): number {
  return EVENT_PROGRESS_FLOOR[type] ?? 15;
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
    partial_credit_stop: "Saved partial progress",
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
  if (error) {
    const msg = error.message ?? "";
    if (isBuildEventsSchemaError(msg)) {
      markBuildJobEventsTableMissing(true);
      logBuildEventsSetupWarningOnce();
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      console.warn("[build-events] persist failed:", msg);
    }
  } else {
    markBuildJobEventsTableMissing(false);
  }
}

export async function persistWorkflowEvent(
  writer: Writer,
  ctx: { jobId: string; projectId: string; userId: string },
  ev: WorkflowEvent,
  progressPercent?: number,
): Promise<void> {
  // Terminal "failed" is written only by executeStagedBuildJob after finalizeBuildFailed.
  if (ev.type === "failed") return;

  const type = mapWorkflowEventToJobType(ev.type);
  const filePath = extractFilePath(ev.detail) ?? extractFilePath(ev.label);
  const pct = Math.max(
    progressPercent ?? defaultProgressForEventType(type),
    defaultProgressForEventType(type),
  );
  await persistBuildJobEvent(writer, {
    jobId: ctx.jobId,
    projectId: ctx.projectId,
    userId: ctx.userId,
    type,
    title: userTitleForJobEvent(type, ev.label),
    detail: ev.detail ?? ev.label,
    filePath,
    progressPercent: pct,
  });
}

export async function emitInitialBuildEvents(
  writer: Writer,
  ctx: { jobId: string; projectId: string; userId: string },
): Promise<void> {
  await persistBuildJobEvent(writer, {
    ...ctx,
    type: "job_created",
    title: "Starting build",
    detail: "Reading your prompt and choosing the right build path",
    progressPercent: 1,
  });
  await persistBuildJobEvent(writer, {
    ...ctx,
    type: "understanding_request",
    title: "Understanding request",
    detail: "Reading your prompt and choosing the right build path",
    progressPercent: 5,
  });
  await persistBuildJobEvent(writer, {
    ...ctx,
    type: "planning_app",
    title: "Planning app structure",
    detail: "Creating routes, pages, and data model",
    progressPercent: 12,
  });
  await persistBuildJobEvent(writer, {
    ...ctx,
    type: "understanding_request",
    title: "Planning data model",
    detail: "Mapping tables and relationships",
    progressPercent: 14,
  });
  await persistBuildJobEvent(writer, {
    ...ctx,
    type: "checking_file",
    title: "Checking existing files",
    detail: "Scanning your project workspace",
    progressPercent: 16,
  });
}

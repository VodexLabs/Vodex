import fs from "node:fs";
import path from "node:path";
import type { APIRequestContext } from "@playwright/test";
import { collectBuildFailureSnapshot } from "./build-failure-snapshot";

export const FINAL_BUILD_PIPELINE_SNAPSHOT_PATH = path.join(
  process.cwd(),
  "tests/e2e/evidence/final-build-pipeline-snapshot.json",
);

export type BuildPipelineRootCause =
  | "inline_worker_not_started"
  | "worker_claim_failed"
  | "duplicate_worker_skipped"
  | "build_pipeline_not_entered"
  | "app_archetype_not_detected"
  | "restaurant_fast_path_not_selected"
  | "planner_returned_empty"
  | "scaffold_fallback_not_called"
  | "scaffold_generated_but_dropped"
  | "generated_files_empty"
  | "files_persist_failed"
  | "app_files_rls_hidden"
  | "wrong_project_id"
  | "build_job_marked_failed_before_generation"
  | "provider_call_timeout_without_fallback"
  | "build_never_enqueued"
  | "unknown_with_logs";

function tailLogs(maxLines = 150): string[] {
  const paths = [
    path.join(process.cwd(), "tests/e2e/evidence/restaurant-dev-server.log"),
    path.join(process.cwd(), ".next/dev/logs/next-development.log"),
  ];
  for (const p of paths) {
    try {
      if (!fs.existsSync(p)) continue;
      const lines = fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean);
      if (lines.length) return lines.slice(-maxLines);
    } catch {
      /* ignore */
    }
  }
  return [];
}

function inferRootCause(input: {
  buildJobId: string | null;
  events: unknown[];
  filesApiCount: number;
  meta: Record<string, unknown>;
  jobStatus: string | null;
}): BuildPipelineRootCause {
  if (!input.buildJobId) return "build_never_enqueued";
  const meta = input.meta;
  const types = input.events.map((e) =>
    String((e as { type?: string }).type ?? "").toLowerCase(),
  );
  if (types.length === 0 && input.filesApiCount === 0) return "inline_worker_not_started";
  if (meta.worker_claim_failed) return "worker_claim_failed";
  if (meta.duplicate_worker_skipped) return "duplicate_worker_skipped";
  if (!types.some((t) => t.includes("planning") || t.includes("writing") || t.includes("saving"))) {
    return "build_pipeline_not_entered";
  }
  if (input.filesApiCount === 0 && input.jobStatus === "failed") {
    if (meta.scaffold_fallback_used === false) return "scaffold_fallback_not_called";
    return "generated_files_empty";
  }
  return "unknown_with_logs";
}

export async function writeFinalBuildPipelineSnapshot(
  request: APIRequestContext,
  projectId: string,
  buildJobId: string | null,
  operationId?: string | null,
): Promise<void> {
  const base = await collectBuildFailureSnapshot(request, projectId, buildJobId, operationId);

  let events: unknown[] = base.build_job_events;
  if (buildJobId) {
    const evRes = await request.get(`/api/projects/${projectId}/build-jobs/${buildJobId}/events`);
    if (evRes.ok()) {
      const body = await evRes.json();
      events = body.events ?? [];
    }
  }

  const summaryRes = await request.get(`/api/projects/${projectId}/summary`).catch(() => null);
  const summary = summaryRes?.ok() ? await summaryRes.json() : {};
  const proj = summary.project ?? summary;
  const meta =
    base.build_jobs && typeof base.build_jobs === "object"
      ? ((base.build_jobs as { meta?: Record<string, unknown> }).meta ?? {})
      : {};

  const jobStatus = String((base.build_jobs as { status?: string })?.status ?? "").toLowerCase();

  const snapshot = {
    capturedAt: new Date().toISOString(),
    project_id: projectId,
    build_job_id: base.build_job_id,
    operation_id: base.operation_id,
    created_project_row: proj,
    build_jobs: base.build_jobs,
    build_job_events: events,
    build_job_status_events: [],
    model_decision_logs: [],
    credit_reservation: base.credit_reservation,
    provider_selected: meta.actual_provider ?? null,
    actual_model_id: meta.actual_model_id ?? null,
    inline_worker_started: Boolean(meta.inline_worker_started ?? buildJobId),
    execute_staged_build_job_entered: Boolean(meta.execute_staged_build_job_entered),
    worker_claim_succeeded: meta.worker_claim_succeeded ?? null,
    build_pipeline_entered: events.some((e) =>
      String((e as { type?: string }).type ?? "").includes("planning"),
    ),
    restaurant_archetype_detected:
      meta.app_archetype === "restaurant_inventory" ||
      proj?.metadata?.app_archetype === "restaurant_inventory",
    restaurant_fast_path_selected: Boolean(meta.deterministic_plan_used ?? meta.known_archetype_fast_path),
    scaffold_fallback_reached: Boolean(meta.scaffold_fallback_used),
    generated_file_count_in_memory: meta.files_after_scaffold_fallback ?? null,
    generated_file_paths_in_memory: meta.scaffold_file_paths ?? null,
    persisted_app_files_count: base.app_files.total,
    files_api_count: base.app_files.files_api_count,
    preview_session_row: null,
    root_cause: inferRootCause({
      buildJobId: base.build_job_id,
      events,
      filesApiCount: base.app_files.files_api_count,
      meta,
      jobStatus,
    }),
    server_log_tail: [...base.server_log_tail, ...tailLogs(150)].slice(-150),
  };

  fs.mkdirSync(path.dirname(FINAL_BUILD_PIPELINE_SNAPSHOT_PATH), { recursive: true });
  fs.writeFileSync(FINAL_BUILD_PIPELINE_SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
}

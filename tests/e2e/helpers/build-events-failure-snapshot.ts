import fs from "node:fs";
import path from "node:path";
import type { APIRequestContext } from "@playwright/test";
import { classifyBuildFailureRootCause } from "../../../src/lib/build/archetype-scaffold-fallback";
import { collectBuildFailureSnapshot } from "./build-failure-snapshot";

export const BUILD_EVENTS_SNAPSHOT_PATH = path.join(
  process.cwd(),
  "tests/e2e/evidence/build-events-failure-snapshot.json",
);

export type BuildEventsFailureSnapshot = {
  capturedAt: string;
  project_id: string;
  build_job_id: string | null;
  operation_id: string | null;
  root_cause: string;
  build_jobs: Record<string, unknown> | null;
  build_job_events: unknown[];
  build_job_status_events: unknown[];
  model_decision_logs: unknown[];
  app_files_by_source: { generated: number; zip_import: number; total: number; files_api_count: number };
  in_memory_files_before_persist: number | null;
  scaffold_files_count: number | null;
  validation_failures: string[];
  repair_attempts: number | null;
  repair_output_file_count: number | null;
  final_contract: { passed: boolean; failures: string[] };
  credit_reservation: unknown | null;
  provider_model: { provider: string | null; model: string | null };
  scaffold_fallback_used: boolean;
  files_before_scaffold_fallback: number | null;
  files_after_scaffold_fallback: number | null;
  component_count: number | null;
  route_page_count: number | null;
  import_graph_ok: boolean | null;
  ui_quality_score: number | null;
  server_log_tail: string[];
};

function tailFile(filePath: string, maxLines = 100): string[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    return lines.slice(-maxLines).filter(Boolean);
  } catch {
    return [];
  }
}

export async function writeBuildEventsFailureSnapshot(
  request: APIRequestContext,
  projectId: string,
  jobId: string | null,
  operationId?: string | null,
): Promise<BuildEventsFailureSnapshot> {
  const base = await collectBuildFailureSnapshot(request, projectId, jobId, operationId);

  const statusRes = await request.get(`/api/projects/${projectId}/status`).catch(() => null);
  const statusBody = statusRes?.ok() ? await statusRes.json() : {};
  const buildJob = statusBody.buildJob ?? null;
  const meta =
    buildJob?.meta && typeof buildJob.meta === "object"
      ? (buildJob.meta as Record<string, unknown>)
      : buildJob?.metadata && typeof buildJob.metadata === "object"
        ? (buildJob.metadata as Record<string, unknown>)
        : {};

  let events: unknown[] = base.build_job_events;
  const resolvedJobId = base.build_job_id;
  if (resolvedJobId) {
    const evRes = await request.get(
      `/api/projects/${projectId}/build-jobs/${resolvedJobId}/events`,
    );
    if (evRes.ok()) {
      const evBody = await evRes.json();
      events = (evBody.events ?? []).slice(-20);
    }
  }

  const summaryRes = await request.get(`/api/projects/${projectId}/summary`).catch(() => null);
  const summary = summaryRes?.ok() ? await summaryRes.json() : {};
  const proj = summary.project ?? summary;
  const projMeta = (proj.metadata ?? {}) as Record<string, unknown>;

  const contractFailures: string[] =
    base.contract_failures.length > 0
      ? base.contract_failures
      : Array.isArray(projMeta.build_contract_failures)
        ? projMeta.build_contract_failures.map(String)
        : [];

  const scaffoldUsed = Boolean(meta.scaffold_fallback_used);
  const beforeFallback = Number(meta.files_before_scaffold_fallback ?? NaN);
  const afterFallback = Number(meta.files_after_scaffold_fallback ?? NaN);

  const logPaths = [
    path.join(process.cwd(), ".next/dev/logs/next-development.log"),
    path.join(process.cwd(), "tests/e2e/evidence/restaurant-dev-server.log"),
  ];
  let logTail: string[] = base.server_log_tail;
  for (const p of logPaths) {
    const t = tailFile(p, 100);
    if (t.length > logTail.length) logTail = t;
  }

  const jobStatus = String(buildJob?.status ?? base.summary.terminal_status ?? "").toLowerCase();
  const progress = Number(buildJob?.progress ?? statusBody.progressPercent ?? 0);
  const eventTypes = events.map((e) => String((e as { type?: string }).type ?? "").toLowerCase());
  const onlyEarlyPlanning =
    eventTypes.length > 0 &&
    eventTypes.every((t) =>
      ["job_created", "queued", "understanding_request", "planning_app"].includes(t),
    );

  let rootCause = classifyBuildFailureRootCause({
    archetypeId: String(meta.app_archetype ?? projMeta.app_archetype ?? "unknown"),
    scaffoldUsed,
    renderableBeforeFallback: Number.isFinite(beforeFallback) ? beforeFallback : 0,
    renderableAfterFallback: Number.isFinite(afterFallback) ? afterFallback : base.app_files.files_api_count,
    contractPassed: Boolean(statusBody.contract?.passed),
    contractFailures,
    persistReached: eventTypes.some((t) => t === "saving_files" || t === "completed"),
    persistOk: base.app_files.files_api_count >= 4,
    persistedCount: base.app_files.files_api_count,
    filesClearedAfterFailure:
      jobStatus === "failed" && base.app_files.files_api_count === 0,
  });

  if (
    (jobStatus === "running" || jobStatus === "building") &&
    progress <= 15 &&
    onlyEarlyPlanning &&
    base.app_files.files_api_count === 0
  ) {
    rootCause = "timeout_before_generation_finished";
  }

  const snapshot: BuildEventsFailureSnapshot = {
    capturedAt: new Date().toISOString(),
    project_id: projectId,
    build_job_id: resolvedJobId,
    operation_id: base.operation_id,
    root_cause: rootCause,
    build_jobs: base.build_jobs,
    build_job_events: events,
    build_job_status_events: [],
    model_decision_logs: [],
    app_files_by_source: {
      generated: base.app_files.generated,
      zip_import: base.app_files.zip_import,
      total: base.app_files.total,
      files_api_count: base.app_files.files_api_count,
    },
    in_memory_files_before_persist: Number.isFinite(afterFallback) ? afterFallback : null,
    scaffold_files_count: scaffoldUsed && Number.isFinite(afterFallback) ? afterFallback : null,
    validation_failures: contractFailures,
    repair_attempts: typeof meta.post_build_repair_passes === "number" ? meta.post_build_repair_passes : null,
    repair_output_file_count: null,
    final_contract: {
      passed: Boolean(statusBody.contract?.passed),
      failures: contractFailures,
    },
    credit_reservation: base.credit_reservation,
    provider_model: {
      provider: (meta.actual_provider as string) ?? null,
      model: (meta.actual_model_id as string) ?? null,
    },
    scaffold_fallback_used: scaffoldUsed,
    files_before_scaffold_fallback: Number.isFinite(beforeFallback) ? beforeFallback : null,
    files_after_scaffold_fallback: Number.isFinite(afterFallback) ? afterFallback : null,
    component_count: typeof projMeta.component_count === "number" ? projMeta.component_count : null,
    route_page_count: null,
    import_graph_ok: !contractFailures.some((f) => f.startsWith("missing_import")),
    ui_quality_score:
      typeof meta.ui_quality_score === "number"
        ? meta.ui_quality_score
        : typeof projMeta.ui_quality_score === "number"
          ? projMeta.ui_quality_score
          : null,
    server_log_tail: logTail,
  };

  fs.mkdirSync(path.dirname(BUILD_EVENTS_SNAPSHOT_PATH), { recursive: true });
  fs.writeFileSync(BUILD_EVENTS_SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));

  console.error(
    "[build-events-failure-snapshot]",
    `root_cause=${rootCause}`,
    `scaffold=${scaffoldUsed}`,
    `files=${snapshot.app_files_by_source.files_api_count}`,
    `path=${BUILD_EVENTS_SNAPSHOT_PATH}`,
  );

  return snapshot;
}

import fs from "node:fs";
import path from "node:path";
import type { APIRequestContext } from "@playwright/test";

const SNAPSHOT_PATH = path.join(process.cwd(), "tests/e2e/evidence/build-failure-snapshot.json");

export type BuildFailureSnapshot = {
  capturedAt: string;
  project_id: string;
  build_job_id: string | null;
  operation_id: string | null;
  build_jobs: Record<string, unknown> | null;
  app_files: {
    total: number;
    generated: number;
    zip_import: number;
    files_api_count: number;
  };
  build_job_events: unknown[];
  model_decision_logs: unknown[];
  credit_reservation: unknown | null;
  credit_events: unknown[];
  preview_session: unknown | null;
  contract_failures: string[];
  server_log_tail: string[];
  build_pipeline_success_after_failed: boolean;
  summary: {
    terminal_status: string | null;
    file_count: number;
    last_event: string | null;
    failure_reason: string | null;
    later_success_log: boolean;
  };
};

function tailFile(filePath: string, maxLines = 40): string[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    return lines.slice(-maxLines).filter(Boolean);
  } catch {
    return [];
  }
}

function logHasPipelineSuccess(lines: string[]): boolean {
  return lines.some((l) => l.includes("build_pipeline_success") || l.includes("async_build_success"));
}

export async function collectBuildFailureSnapshot(
  request: APIRequestContext,
  projectId: string,
  jobId: string | null,
  operationId?: string | null,
): Promise<BuildFailureSnapshot> {
  const statusRes = await request.get(`/api/projects/${projectId}/status`).catch(() => null);
  const statusBody = statusRes?.ok() ? await statusRes.json() : {};
  const buildJob = statusBody.buildJob ?? null;
  const contractFailures: string[] = Array.isArray(statusBody.contract?.failures)
    ? statusBody.contract.failures.map(String)
    : [];

  let events: unknown[] = [];
  const resolvedJobId = jobId ?? statusBody.buildJobId ?? buildJob?.id ?? null;
  if (resolvedJobId) {
    const evRes = await request.get(
      `/api/projects/${projectId}/build-jobs/${resolvedJobId}/events`,
    );
    if (evRes.ok()) {
      const evBody = await evRes.json();
      const list = evBody.events ?? [];
      events = list.slice(-10);
    }
  }

  const filesRes = await request.get(`/api/projects/${projectId}/files`);
  const filesBody = filesRes.ok() ? await filesRes.json() : {};
  const filesApiCount = Number(filesBody.count ?? 0);

  const summaryRes = await request.get(`/api/projects/${projectId}/summary`).catch(() => null);
  const summary = summaryRes?.ok() ? await summaryRes.json() : {};
  const proj = summary.project ?? summary;
  const meta = proj.metadata ?? {};

  const logPaths = [
    path.join(process.cwd(), ".next/dev/logs/next-development.log"),
    path.join(process.cwd(), ".next/dev/logs/next-development.log".replace(/\//g, "\\")),
  ];
  let logTail: string[] = [];
  for (const p of logPaths) {
    logTail = tailFile(p, 50);
    if (logTail.length) break;
  }

  const terminalStatus = String(buildJob?.status ?? proj.build_status ?? "unknown");
  const lastEv = events.length ? (events[events.length - 1] as { type?: string; title?: string }) : null;
  const lastEvent = lastEv ? String(lastEv.type ?? lastEv.title ?? "?") : null;
  const laterSuccess =
    terminalStatus === "failed" && logHasPipelineSuccess(logTail);

  const snapshot: BuildFailureSnapshot = {
    capturedAt: new Date().toISOString(),
    project_id: projectId,
    build_job_id: resolvedJobId ? String(resolvedJobId) : null,
    operation_id: operationId ?? (meta.operation_id as string | undefined) ?? null,
    build_jobs: buildJob
      ? {
          status: buildJob.status,
          progress: buildJob.progress,
          error_message: buildJob.error_message,
          current_stage: buildJob.currentStage,
          updated_at: buildJob.updatedAt,
          claimed_by: (buildJob as { claimed_by?: string }).claimed_by,
          execution_instance_id: (buildJob as { execution_instance_id?: string }).execution_instance_id,
        }
      : null,
    app_files: {
      total: filesApiCount,
      generated: filesApiCount,
      zip_import: 0,
      files_api_count: filesApiCount,
    },
    build_job_events: events,
    model_decision_logs: [],
    credit_reservation: null,
    credit_events: [],
    preview_session: proj.preview_url ? { preview_url: proj.preview_url } : null,
    contract_failures: contractFailures,
    server_log_tail: logTail,
    build_pipeline_success_after_failed: laterSuccess,
    summary: {
      terminal_status: terminalStatus,
      file_count: filesApiCount,
      last_event: lastEvent,
      failure_reason: buildJob?.error_message ?? contractFailures[0] ?? null,
      later_success_log: laterSuccess,
    },
  };

  return snapshot;
}

export async function writeBuildFailureSnapshot(
  request: APIRequestContext,
  projectId: string,
  jobId: string | null,
  operationId?: string | null,
): Promise<BuildFailureSnapshot> {
  const snapshot = await collectBuildFailureSnapshot(request, projectId, jobId, operationId);
  const dir = path.dirname(SNAPSHOT_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));

  const s = snapshot.summary;
  console.error(
    "[build-failure-snapshot]",
    `status=${s.terminal_status}`,
    `files=${s.file_count}`,
    `last_event=${s.last_event}`,
    `reason=${s.failure_reason ?? "?"}`,
    `later_success_log=${s.later_success_log}`,
    `path=${SNAPSHOT_PATH}`,
  );

  return snapshot;
}

export { SNAPSHOT_PATH };

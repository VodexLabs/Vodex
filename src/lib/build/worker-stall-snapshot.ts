import fs from "node:fs";
import path from "node:path";
import type { BuildWorkerTraceSnapshot } from "@/lib/build/build-worker-trace";

export const WORKER_STALL_SNAPSHOT_PATH = path.join(
  process.cwd(),
  "tests/e2e/evidence/worker-stall-snapshot.json",
);

export type WorkerStallSnapshot = {
  capturedAt: string;
  project_id: string | null;
  build_job_id: string;
  operation_id: string;
  last_persisted_event: string | null;
  in_memory_trace: BuildWorkerTraceSnapshot | null;
  model_call: BuildWorkerTraceSnapshot["modelCall"] | null;
  provider_model: { provider: string | null; model: string | null };
  request_timeout_ms: number | null;
  abort_controller_used: boolean;
  deterministic_fallback_available: boolean;
  heartbeat_running: boolean;
  root_cause_hint: string;
};

export async function writeWorkerStallSnapshot(input: {
  buildJobId: string;
  projectId: string;
  operationId: string;
  trace: BuildWorkerTraceSnapshot | null;
}): Promise<WorkerStallSnapshot> {
  const snap = input.trace;
  const snapshot: WorkerStallSnapshot = {
    capturedAt: new Date().toISOString(),
    project_id: input.projectId,
    build_job_id: input.buildJobId,
    operation_id: input.operationId,
    last_persisted_event: snap?.lastStage ?? null,
    in_memory_trace: snap,
    model_call: snap?.modelCall ?? null,
    provider_model: {
      provider: snap?.modelCall.provider ?? null,
      model: snap?.modelCall.model ?? null,
    },
    request_timeout_ms: snap?.modelCall.timeoutMs ?? null,
    abort_controller_used: true,
    deterministic_fallback_available: true,
    heartbeat_running: snap?.heartbeatRunning ?? false,
    root_cause_hint: snap?.modelCall.state === "pending"
      ? "model_call_pending"
      : snap?.lastStage === "worker_claim_attempt"
        ? "worker_never_claimed"
        : snap?.lastStage ?? "unknown",
  };

  fs.mkdirSync(path.dirname(WORKER_STALL_SNAPSHOT_PATH), { recursive: true });
  fs.writeFileSync(WORKER_STALL_SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));

  console.error(
    "[worker-stall-snapshot]",
    `stage=${snapshot.last_persisted_event}`,
    `model=${snapshot.model_call?.state ?? "idle"}`,
    `path=${WORKER_STALL_SNAPSHOT_PATH}`,
  );

  return snapshot;
}

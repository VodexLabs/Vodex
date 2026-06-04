import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { loadPreviewWorkerStatus } from "@/lib/preview/preview-worker-status";
import type { StatusLevel } from "@/lib/status/status-types";

export type StatusHealthSignal = {
  key: string;
  status: StatusLevel;
  detail: string;
};

const QUEUE_DEGRADED_SECONDS = 300;
const QUEUE_OUTAGE_SECONDS = 900;
const ZIP_FAIL_RATE_DEGRADED = 0.35;

function worst(a: StatusLevel, b: StatusLevel): StatusLevel {
  const rank: Record<StatusLevel, number> = {
    operational: 0,
    maintenance: 1,
    degraded: 2,
    partial_outage: 3,
    major_outage: 4,
  };
  return rank[a] >= rank[b] ? a : b;
}

function workerComponentStatus(worker: Awaited<ReturnType<typeof loadPreviewWorkerStatus>>): StatusLevel {
  if (!worker.connected) return "partial_outage";
  if (worker.queueAgeSeconds >= QUEUE_OUTAGE_SECONDS) return "partial_outage";
  if (worker.queueAgeSeconds >= QUEUE_DEGRADED_SECONDS) return "degraded";
  if (worker.failedJobs24h > 0 && worker.completedJobs24h === 0) return "degraded";
  return "operational";
}

function zipPreviewStatus(worker: Awaited<ReturnType<typeof loadPreviewWorkerStatus>>): StatusLevel {
  const total = worker.failedJobs24h + worker.completedJobs24h;
  if (total < 3) return workerComponentStatus(worker);
  const failRate = worker.failedJobs24h / total;
  if (failRate >= ZIP_FAIL_RATE_DEGRADED) return "degraded";
  return workerComponentStatus(worker);
}

export async function collectStatusHealthSignals(
  db: SupabaseClient,
): Promise<StatusHealthSignal[]> {
  const worker = await loadPreviewWorkerStatus();
  const signals: StatusHealthSignal[] = [];

  signals.push({
    key: "preview_rendering",
    status: workerComponentStatus(worker),
    detail: worker.connected
      ? `Workers: ${worker.workerCount}, queue age ${worker.queueAgeSeconds}s`
      : "No preview worker heartbeat in the last 90s",
  });

  signals.push({
    key: "build_queue",
    status:
      worker.pendingJobs > 80
        ? "partial_outage"
        : worker.pendingJobs > 25
          ? "degraded"
          : workerComponentStatus(worker),
    detail: `Pending ${worker.pendingJobs}, running ${worker.runningJobs}`,
  });

  signals.push({
    key: "app_preview",
    status: zipPreviewStatus(worker),
    detail: `ZIP/preview jobs 24h: ${worker.completedJobs24h} ok, ${worker.failedJobs24h} failed`,
  });

  const { error: dbErr } = await db.from("profiles").select("id").limit(1);
  signals.push({
    key: "supabase",
    status: dbErr ? "degraded" : "operational",
    detail: dbErr ? dbErr.message : "Database reachable",
  });

  signals.push({
    key: "email_resend",
    status: process.env.RESEND_API_KEY ? "operational" : "degraded",
    detail: process.env.RESEND_API_KEY ? "Resend configured" : "RESEND_API_KEY not set",
  });

  signals.push({
    key: "notifications",
    status: "operational",
    detail: "In-app delivery monitored via service-role inserts",
  });

  signals.push({
    key: "paddle_checkout",
    status: process.env.PADDLE_API_KEY || process.env.PADDLE_WEBHOOK_SECRET ? "operational" : "degraded",
    detail: "Paddle env present",
  });

  return signals;
}

export async function runStatusHealthAutomation(): Promise<{
  ok: boolean;
  overallStatus: StatusLevel;
  updated: number;
  error?: string;
}> {
  const admin = createSupabaseAdmin();
  if (!admin) {
    return { ok: false, overallStatus: "degraded", updated: 0, error: "service_unavailable" };
  }

  const signals = await collectStatusHealthSignals(admin);
  let overall: StatusLevel = "operational";
  let updated = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  for (const signal of signals) {
    overall = worst(overall, signal.status);
    const { error } = await db
      .from("status_components")
      .update({ current_status: signal.status, updated_at: new Date().toISOString() })
      .eq("key", signal.key);
    if (!error) updated += 1;
  }

  await db.from("status_health_snapshots").insert({
    overall_status: overall,
    components: signals,
    signals: { at: new Date().toISOString() },
  });

  return { ok: true, overallStatus: overall, updated };
}

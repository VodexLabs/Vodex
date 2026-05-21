import { dreamosLog } from "@/lib/diagnostics/dreamos-logger";

/** Owner-only in-app runtime event log (sessionStorage, max 50). */

export type RuntimeDiagnosticEvent =
  | "prompt_submit_started"
  | "prompt_submit_skipped_duplicate"
  | "prompt_submit_consumed_once"
  | "intent_classified"
  | "preflight_ok"
  | "preflight_failed"
  | "stream_started"
  | "stream_finished"
  | "stream_failed"
  | "conversation_created"
  | "conversation_create_failed"
  | "profile_ensure_started"
  | "profile_ensure_failed"
  | "profile_ensure_succeeded"
  | "provider_call_blocked"
  | "provider_call_started"
  | "provider_call_failed"
  | "app_identity_started"
  | "app_identity_failed"
  | "app_identity_succeeded"
  | "icon_svg_started"
  | "icon_svg_failed"
  | "icon_svg_succeeded"
  | "project_metadata_saved"
  | "project_metadata_failed"
  | "build_job_created"
  | "build_step_started"
  | "build_step_completed"
  | "files_saved"
  | "files_persist_failed"
  | "preview_generated"
  | "preview_compile_failed"
  | "charge_started"
  | "charge_success"
  | "charge_failed"
  | "charge_tokens_missing"
  | "schema_warning"
  | "publish_readiness"
  | "queue_add"
  | "queue_drain"
  | "error_boundary";

export type RuntimeDiagnosticEntry = {
  event: RuntimeDiagnosticEvent;
  at: string;
  detail?: Record<string, unknown>;
};

const STORAGE_KEY = "dreamos86.runtimeDiagnostics";
const MAX = 100;

const EVENT_CATEGORY: Partial<Record<RuntimeDiagnosticEvent, import("@/lib/diagnostics/dreamos-logger").DreamosLogCategory>> = {
  charge_failed: "credit",
  charge_tokens_missing: "credit",
  charge_success: "credit",
  charge_started: "credit",
  build_step_started: "build",
  build_step_completed: "build",
  build_job_created: "build",
  prompt_submit_skipped_duplicate: "duplicate_prompt",
  stream_failed: "api_error",
  preflight_failed: "api_error",
  files_persist_failed: "api_error",
  error_boundary: "frontend_error",
  schema_warning: "supabase",
  publish_readiness: "publish",
};

export function pushRuntimeDiagnostic(
  event: RuntimeDiagnosticEvent,
  detail?: Record<string, unknown>,
): void {
  dreamosLog({
    source: "client",
    category: EVENT_CATEGORY[event] ?? "general",
    severity:
      event.includes("failed") || event === "error_boundary" || event === "charge_tokens_missing"
        ? "warn"
        : "info",
    action: event,
    message: event.replace(/_/g, " "),
    metadata: detail,
    projectId: typeof detail?.projectId === "string" ? detail.projectId : null,
    conversationId: typeof detail?.conversationId === "string" ? detail.conversationId : null,
    buildId: typeof detail?.buildJobId === "string" ? detail.buildJobId : null,
  });

  if (typeof sessionStorage === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const prev: RuntimeDiagnosticEntry[] = raw ? (JSON.parse(raw) as RuntimeDiagnosticEntry[]) : [];
    const next: RuntimeDiagnosticEntry[] = [
      { event, at: new Date().toISOString(), detail },
      ...prev,
    ].slice(0, MAX);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

export function readRuntimeDiagnostics(): RuntimeDiagnosticEntry[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RuntimeDiagnosticEntry[]) : [];
  } catch {
    return [];
  }
}

export function clearRuntimeDiagnostics(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

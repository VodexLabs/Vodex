/**
 * Internal model decision audit log — admin-only, never shown to normal users.
 * Persists to Supabase when available; in-memory ring buffer as fallback.
 */
import type { ModelMixMode } from "@/lib/ai/model-mix-router";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export type InternalModelDecisionRecord = {
  operation_id: string;
  user_id?: string | null;
  project_id?: string | null;
  mode: ModelMixMode | string;
  user_selected_model: string | null;
  helper_model_used: string | null;
  main_model_used: string;
  provider_used: string;
  fallback_provider: string | null;
  fallback_reason: string | null;
  estimated_cost_bucket: "micro" | "low" | "medium" | "high";
  actual_input_tokens: number | null;
  actual_output_tokens: number | null;
  actual_cost_usd: number | null;
  latency_ms: number | null;
  success: boolean;
  hidden_from_user: true;
  timestamp: string;
};

const recent: InternalModelDecisionRecord[] = [];
const MAX = 500;

type LooseDb = {
  from: (table: string) => {
    insert: (row: unknown) => Promise<{ error: { message: string } | null }>;
    select: (cols?: string) => {
      order: (col: string, opts: { ascending: boolean }) => {
        limit: (n: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
      };
    };
  };
};

function toDbRow(input: Omit<InternalModelDecisionRecord, "timestamp" | "hidden_from_user">) {
  return {
    operation_id: input.operation_id,
    user_id: input.user_id ?? null,
    project_id: input.project_id ?? null,
    mode: input.mode,
    user_selected_model: input.user_selected_model,
    helper_model_used: input.helper_model_used,
    main_model_used: input.main_model_used,
    provider_used: input.provider_used,
    fallback_provider: input.fallback_provider,
    fallback_reason: input.fallback_reason,
    estimated_cost_bucket: input.estimated_cost_bucket,
    input_tokens: input.actual_input_tokens,
    output_tokens: input.actual_output_tokens,
    actual_cost_usd: input.actual_cost_usd,
    latency_ms: input.latency_ms,
    status: input.success ? "success" : "error",
  };
}

let persistPermissionWarned = false;

async function persistModelDecisionToDb(
  input: Omit<InternalModelDecisionRecord, "timestamp" | "hidden_from_user">,
): Promise<void> {
  const admin = createServiceRoleClient();
  if (!admin) {
    if (!persistPermissionWarned && process.env.NODE_ENV !== "production") {
      persistPermissionWarned = true;
      console.warn("[model-decision] persist skipped: service_role_unavailable");
    }
    return;
  }
  const db = admin as unknown as LooseDb;
  const { error } = await db.from("model_decision_logs").insert(toDbRow(input));
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("model_decision_logs") && msg.includes("does not exist")) {
      if (!persistPermissionWarned) {
        persistPermissionWarned = true;
        console.warn("[model-decision] table missing — run migration 20260624180000_model_decision_logs");
      }
      return;
    }
    if (msg.includes("permission denied") && !persistPermissionWarned) {
      persistPermissionWarned = true;
      console.warn(
        "[model-decision] persist failed: permission denied — apply migration 20260520120001_model_decision_logs_grants.sql",
      );
      return;
    }
    if (!persistPermissionWarned && process.env.NODE_ENV !== "production") {
      persistPermissionWarned = true;
      console.warn("[model-decision] persist failed:", msg);
    }
  }
}

export function logInternalModelDecision(
  input: Omit<InternalModelDecisionRecord, "timestamp" | "hidden_from_user">,
): InternalModelDecisionRecord {
  const record: InternalModelDecisionRecord = {
    ...input,
    hidden_from_user: true,
    timestamp: new Date().toISOString(),
  };
  recent.unshift(record);
  if (recent.length > MAX) recent.length = MAX;

  void persistModelDecisionToDb(input).catch((err) => {
    console.warn("[model-decision] persist error:", err instanceof Error ? err.message : err);
  });

  if (process.env.NODE_ENV !== "production") {
    console.info(
      "[model-decision]",
      input.mode,
      "helper=",
      input.helper_model_used,
      "main=",
      input.main_model_used,
    );
  }
  return record;
}

export function getRecentInternalModelDecisions(limit = 50): InternalModelDecisionRecord[] {
  return recent.slice(0, limit);
}

export async function fetchRecentModelDecisionLogsFromDb(limit = 50): Promise<InternalModelDecisionRecord[]> {
  const admin = createServiceRoleClient();
  if (!admin) return getRecentInternalModelDecisions(limit);

  const db = admin as unknown as LooseDb;
  const { data, error } = await db
    .from("model_decision_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data?.length) return getRecentInternalModelDecisions(limit);

  return (data as Array<Record<string, unknown>>).map((row) => ({
    operation_id: String(row.operation_id ?? ""),
    user_id: (row.user_id as string | null) ?? null,
    project_id: (row.project_id as string | null) ?? null,
    mode: String(row.mode ?? ""),
    user_selected_model: (row.user_selected_model as string | null) ?? null,
    helper_model_used: (row.helper_model_used as string | null) ?? null,
    main_model_used: String(row.main_model_used ?? ""),
    provider_used: String(row.provider_used ?? ""),
    fallback_provider: (row.fallback_provider as string | null) ?? null,
    fallback_reason: (row.fallback_reason as string | null) ?? null,
    estimated_cost_bucket: (row.estimated_cost_bucket as InternalModelDecisionRecord["estimated_cost_bucket"]) ?? "low",
    actual_input_tokens: (row.input_tokens as number | null) ?? null,
    actual_output_tokens: (row.output_tokens as number | null) ?? null,
    actual_cost_usd: row.actual_cost_usd != null ? Number(row.actual_cost_usd) : null,
    latency_ms: (row.latency_ms as number | null) ?? null,
    success: row.status === "success",
    hidden_from_user: true as const,
    timestamp: String(row.created_at ?? new Date().toISOString()),
  }));
}

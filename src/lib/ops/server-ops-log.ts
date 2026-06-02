import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Writer = SupabaseClient<Database>;

export type OpsLogStage =
  | "preflight"
  | "chat"
  | "stream"
  | "files"
  | "preview"
  | "charge"
  | "build"
  | "publish"
  | "schema";

export type OpsLogInput = {
  writer: Writer;
  userId: string;
  userEmail?: string | null;
  stage: OpsLogStage;
  event: string;
  status: "ok" | "error" | "skipped";
  errorMessage?: string | null;
  modelId?: string | null;
  mode?: string | null;
  provider?: string | null;
  projectId?: string | null;
  conversationId?: string | null;
  buildJobId?: string | null;
  operationId?: string | null;
  creditsCharged?: number | null;
  providerCostUsd?: number | null;
  metadata?: Record<string, unknown>;
};

const REDACT_KEYS = /key|secret|token|password|authorization|service_role|apikey/i;

function redactMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (REDACT_KEYS.test(k)) {
      out[k] = "[redacted]";
      continue;
    }
    if (typeof v === "string" && v.length > 500) {
      out[k] = `${v.slice(0, 500)}…`;
      continue;
    }
    out[k] = v;
  }
  return out;
}

/** Server-side observability — ai_usage_logs + console (no secrets). */
export async function logServerOperation(input: OpsLogInput): Promise<void> {
  const line = `[ops] ${input.stage}/${input.event} ${input.status}`;
  const payload = {
    operation_id: input.operationId,
    project_id: input.projectId,
    mode: input.mode,
    model: input.modelId,
    error: input.errorMessage,
  };
  if (input.status === "error") console.warn(line, payload);
  else console.info(line, payload);

  const row: Record<string, unknown> = {
    user_id: input.userId,
    user_email: input.userEmail ?? null,
    model_id: input.modelId ?? "system",
    mode: input.mode ?? input.stage,
    provider: input.provider ?? null,
    route_reason: input.event,
    tokens_charged: 0,
    credits_charged: input.creditsCharged ?? 0,
    status: input.status === "ok" ? "logged" : input.status,
    error_message: input.errorMessage ?? null,
    conversation_id: input.conversationId ?? null,
    project_id: input.projectId ?? null,
    operation_id: input.operationId ?? null,
    metadata: redactMeta({
      stage: input.stage,
      provider_cost_usd: input.providerCostUsd ?? input.metadata?.provider_cost_usd,
      ...input.metadata,
    }),
  };

  let { error } = await input.writer.from("ai_usage_logs").insert(row as never);
  if (error?.message?.includes("column") || error?.message?.includes("does not exist")) {
    const slim = {
      user_id: input.userId,
      user_email: input.userEmail,
      model_id: row.model_id,
      mode: row.mode,
      tokens_charged: 0,
      status: row.status,
      error_message: input.errorMessage,
      conversation_id: input.conversationId,
      operation_id: input.operationId,
    };
    error = (await input.writer.from("ai_usage_logs").insert(slim as never)).error;
  }
  if (error && process.env.NODE_ENV !== "production") {
    console.warn("[ops] ai_usage_logs insert:", error.message);
  }
}

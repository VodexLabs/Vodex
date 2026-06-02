import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Writer = SupabaseClient<Database>;

/** Always record reserve/charge/refund trail in ai_usage_logs (even when net charge is 0). */
export async function logBuildCreditReconciliation(
  writer: Writer,
  input: {
    userId: string;
    userEmail?: string | null;
    operationId: string;
    projectId?: string | null;
    buildJobId?: string | null;
    modelId?: string | null;
    reservedCredits: number;
    finalCharged: number;
    refunded: number;
    providerCostUsd: number;
    success: boolean;
    reason?: string;
    iconCreditSkipped?: boolean;
    iconCreditDepleted?: boolean;
  },
): Promise<void> {
  const row: Record<string, unknown> = {
    user_id: input.userId,
    user_email: input.userEmail ?? null,
    model_id: input.modelId ?? "build_credit_reconcile",
    mode: "build",
    provider: "internal",
    route_reason: "build_credit_reconciliation",
    tokens_charged: 0,
    credits_charged: input.finalCharged,
    status: input.success ? "reconciled" : "refunded",
    project_id: input.projectId ?? null,
    operation_id: input.operationId,
    metadata: {
      credit_reserved: input.reservedCredits,
      credit_charged: input.finalCharged,
      credit_refunded: input.refunded,
      provider_cost_usd: input.providerCostUsd,
      success: input.success,
      explain_zero_charge:
        input.finalCharged === 0 && input.success
          ? input.refunded >= input.reservedCredits
            ? "full_refund_after_reserve"
            : "profitable_charge_skipped_or_floor"
          : input.finalCharged === 0 && !input.success
            ? "build_failed_full_refund"
            : null,
      icon_credit_skipped: input.iconCreditSkipped ?? false,
      icon_credit_depleted: input.iconCreditDepleted ?? false,
      reason: input.reason ?? null,
      build_job_id: input.buildJobId ?? null,
    },
  };

  let { error } = await writer.from("ai_usage_logs").insert(row as never);
  if (error?.message?.includes("column") || error?.message?.includes("does not exist")) {
    const slim = {
      user_id: input.userId,
      model_id: row.model_id,
      mode: row.mode,
      credits_charged: input.finalCharged,
      status: row.status,
      operation_id: input.operationId,
    };
    error = (await writer.from("ai_usage_logs").insert(slim as never)).error;
  }
  if (error && process.env.NODE_ENV !== "production") {
    console.warn("[credits] build reconciliation log failed:", error.message);
  }
}

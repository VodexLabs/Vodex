import { createSupabaseAdmin } from "@/lib/supabase/admin";

/** Refund a prior action-credit charge (same operation_id suffix). */
export async function refundActionCredit(input: {
  ownerUserId: string;
  projectId?: string | null;
  operationId: string;
  reason?: string;
}): Promise<{ ok: boolean; refunded: number }> {
  const admin = createSupabaseAdmin();
  const refundOpId = `${input.operationId}:refund`;

  const { data, error } = await admin.rpc(
    "refund_action_credits" as never,
    {
      p_owner_user_id: input.ownerUserId,
      p_project_id: null,
      p_original_operation_id: input.operationId,
      p_refund_operation_id: refundOpId,
      p_reason: input.reason ?? "provider_or_upload_failed",
    } as never,
  );

  if (error) {
    console.warn("[refund-action-credit]", error.message);
    return { ok: false, refunded: 0 };
  }

  const row = data as { success?: boolean; refunded?: number } | null;
  return { ok: Boolean(row?.success), refunded: row?.refunded ?? 0 };
}

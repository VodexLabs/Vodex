import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { logAdminAudit } from "@/lib/admin/audit-log";
import { listAdminUsers } from "@/lib/admin/list-users";
import { loadCanonicalCredits, serializeCanonicalCredits } from "@/lib/credits/canonical-credits";
import type { AdminActionPayload } from "@/lib/admin/otp-confirmation";
import type { PlanId } from "@/lib/supabase/types";
import { roundCreditOneDecimal } from "@/lib/credits/parse-credit-amount";

export async function executeAdminAction(input: {
  adminUser: { id: string; email?: string | null };
  payload: AdminActionPayload;
  request?: Request;
  otpVerified: boolean;
}): Promise<
  | { ok: true; userId: string; credits: ReturnType<typeof serializeCanonicalCredits> }
  | { ok: false; error: string }
> {
  const targetUserId = input.payload.targetUserId;
  const adminDb = createSupabaseAdmin();

  const { data: beforeProfile } = await adminDb
    .from("profiles")
    .select("plan_id,credits_remaining,suspended_at")
    .eq("id", targetUserId)
    .maybeSingle();

  if (!beforeProfile) {
    return { ok: false, error: "User not found" };
  }

  const { data: beforeActionBalance } = await adminDb
    .from("action_credit_balances" as never)
    .select("balance")
    .eq("owner_user_id" as never, targetUserId)
    .is("project_id" as never, null)
    .maybeSingle();

  let actionLabel: string;
  let rpcResult: { success?: boolean; error?: string } | null = null;
  let rpcError: { message: string } | null = null;

  const adminId = input.adminUser.id;

  switch (input.payload.action) {
    case "add_tokens": {
      if (!input.payload.amount || !input.payload.reason) {
        return { ok: false, error: "amount and reason required" };
      }
      actionLabel = "add_tokens";
      const { data, error } = await adminDb.rpc("admin_add_tokens", {
        p_admin_id: adminId,
        p_user_id: targetUserId,
        p_amount: roundCreditOneDecimal(input.payload.amount),
        p_reason: input.payload.reason,
      });
      rpcResult = data;
      rpcError = error;
      break;
    }
    case "set_balance": {
      if (input.payload.balance === undefined || !input.payload.reason) {
        return { ok: false, error: "balance and reason required" };
      }
      actionLabel = "set_token_balance";
      const { data, error } = await adminDb.rpc("admin_set_token_balance", {
        p_admin_id: adminId,
        p_user_id: targetUserId,
        p_balance: roundCreditOneDecimal(input.payload.balance),
        p_reason: input.payload.reason,
      });
      rpcResult = data;
      rpcError = error;
      break;
    }
    case "reset_monthly": {
      if (!input.payload.reason) return { ok: false, error: "reason required" };
      actionLabel = "reset_monthly_tokens";
      const { data, error } = await adminDb.rpc("admin_reset_monthly_tokens", {
        p_admin_id: adminId,
        p_user_id: targetUserId,
        p_reason: input.payload.reason,
      });
      rpcResult = data;
      rpcError = error;
      break;
    }
    case "set_plan": {
      if (!input.payload.planId || !input.payload.reason) {
        return { ok: false, error: "planId and reason required" };
      }
      actionLabel = "set_plan";
      const { data, error } = await adminDb.rpc("admin_set_plan", {
        p_admin_id: adminId,
        p_user_id: targetUserId,
        p_plan: input.payload.planId as PlanId,
        p_reason: input.payload.reason,
      });
      rpcResult = data;
      rpcError = error;
      break;
    }
    case "add_action_credits": {
      if (!input.payload.amount || !input.payload.reason) {
        return { ok: false, error: "amount and reason required" };
      }
      actionLabel = "add_action_credits";
      const { data, error } = await adminDb.rpc(
        "admin_add_action_credits" as "admin_add_tokens",
        {
          p_admin_id: adminId,
          p_user_id: targetUserId,
          p_amount: roundCreditOneDecimal(input.payload.amount),
          p_reason: input.payload.reason,
        } as never,
      );
      rpcResult = data;
      rpcError = error;
      break;
    }
    case "set_action_credits": {
      if (input.payload.balance === undefined || !input.payload.reason) {
        return { ok: false, error: "balance and reason required" };
      }
      actionLabel = "set_action_credits_balance";
      const { data, error } = await adminDb.rpc(
        "admin_set_action_credits_balance" as "admin_set_token_balance",
        {
          p_admin_id: adminId,
          p_user_id: targetUserId,
          p_balance: roundCreditOneDecimal(input.payload.balance),
          p_reason: input.payload.reason,
        } as never,
      );
      rpcResult = data;
      rpcError = error;
      break;
    }
    case "reset_action_credits_monthly": {
      if (!input.payload.reason) return { ok: false, error: "reason required" };
      actionLabel = "reset_action_credits_monthly";
      const { data, error } = await adminDb.rpc(
        "admin_reset_action_credits_monthly" as "admin_reset_monthly_tokens",
        {
          p_admin_id: adminId,
          p_user_id: targetUserId,
          p_reason: input.payload.reason,
        } as never,
      );
      rpcResult = data;
      rpcError = error;
      break;
    }
    case "suspend": {
      if (!input.payload.reason) return { ok: false, error: "reason required" };
      actionLabel = "suspend_user";
      const { data, error } = await adminDb.rpc("admin_set_suspended", {
        p_admin_id: adminId,
        p_user_id: targetUserId,
        p_suspended: true,
        p_reason: input.payload.reason,
      });
      rpcResult = data;
      rpcError = error;
      break;
    }
    case "unsuspend": {
      actionLabel = "unsuspend_user";
      const { data, error } = await adminDb.rpc("admin_set_suspended", {
        p_admin_id: adminId,
        p_user_id: targetUserId,
        p_suspended: false,
        p_reason: input.payload.reason ?? "unsuspended",
      });
      rpcResult = data;
      rpcError = error;
      break;
    }
    default:
      return { ok: false, error: "Unknown action" };
  }

  if (rpcError || !rpcResult?.success) {
    return { ok: false, error: rpcResult?.error ?? rpcError?.message ?? "Action failed" };
  }

  const { data: afterProfile } = await adminDb
    .from("profiles")
    .select("plan_id,credits_remaining,suspended_at")
    .eq("id", targetUserId)
    .maybeSingle();

  const { data: afterActionBalance } = await adminDb
    .from("action_credit_balances" as never)
    .select("balance")
    .eq("owner_user_id" as never, targetUserId)
    .is("project_id" as never, null)
    .maybeSingle();

  await logAdminAudit(input.adminUser, actionLabel, {
    targetUserId,
    before: {
      ...(beforeProfile as Record<string, unknown>),
      action_credits_remaining: (beforeActionBalance as { balance?: number } | null)?.balance ?? null,
    },
    after: {
      ...(afterProfile ?? {}) as Record<string, unknown>,
      action_credits_remaining: (afterActionBalance as { balance?: number } | null)?.balance ?? null,
    },
    reason: input.payload.reason ?? null,
    amount: input.payload.amount ?? null,
    request: input.request,
    otpVerified: input.otpVerified,
    metadata: { pending_flow: true },
  });

  if (input.payload.action === "add_tokens" && input.payload.amount) {
    await adminDb.from("notifications").insert({
      user_id: targetUserId,
      type: "credit",
      title: `${input.payload.amount} Build Credits added`,
      body: `Support granted ${input.payload.amount} Build Credits. Reason: ${input.payload.reason}`,
      action_url: "/credits",
    });
  }

  if (input.payload.action === "add_action_credits" && input.payload.amount) {
    await adminDb.from("notifications").insert({
      user_id: targetUserId,
      type: "credit",
      title: `${input.payload.amount} Action Credits added`,
      body: `Support granted ${input.payload.amount} Action Credits. Reason: ${input.payload.reason}`,
      action_url: "/settings",
    });
  }

  const canonical = await loadCanonicalCredits({ userId: targetUserId });
  return { ok: true, userId: targetUserId, credits: serializeCanonicalCredits(canonical) };
}

export async function fetchAdminUserAfterAction(userId: string) {
  const { users } = await listAdminUsers({ q: userId, limit: 1 });
  return users[0] ?? null;
}

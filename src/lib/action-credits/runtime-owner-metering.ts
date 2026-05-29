import {
  assertActionCreditsAffordable,
  RUNTIME_ACTION_UNAVAILABLE_MESSAGE,
} from "@/lib/action-credits/assert-action-credits-affordable";
import { chargeActionCredit, type ChargeActionCreditInput } from "@/lib/action-credits/charge-action-credit";
import { monthlyActionCreditsForPlan } from "@/lib/action-credits/action-credit-allowances";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export { RUNTIME_ACTION_UNAVAILABLE_MESSAGE };

export type RuntimeOwnerMeterInput = ChargeActionCreditInput & {
  planId?: string | null;
};

export type RuntimeOwnerMeterResult =
  | { ok: true; charged: number; remaining: number }
  | { ok: false; code: "insufficient" | "blocked"; visitorMessage: string; ownerMessage: string };

export async function meterRuntimeActionForOwner(
  input: RuntimeOwnerMeterInput,
): Promise<RuntimeOwnerMeterResult> {
  const pre = await assertActionCreditsAffordable({
    ownerUserId: input.ownerUserId,
    projectId: input.projectId,
    actionType: input.actionType,
    providerCostUsd: input.providerCostUsd,
  });

  if (!pre.ok) {
    await logBlockedRuntimeAction(input, pre.required, pre.balance);
    return {
      ok: false,
      code: "insufficient",
      visitorMessage: RUNTIME_ACTION_UNAVAILABLE_MESSAGE,
      ownerMessage: "Action Credits depleted — runtime AI, email, and media are paused until your balance resets or you add credits.",
    };
  }

  const charge = await chargeActionCredit(input);
  if (!charge.ok) {
    await logBlockedRuntimeAction(input, pre.required, pre.balance);
    return {
      ok: false,
      code: charge.code === "insufficient" ? "insufficient" : "blocked",
      visitorMessage: RUNTIME_ACTION_UNAVAILABLE_MESSAGE,
      ownerMessage: charge.error,
    };
  }

  return { ok: true, charged: charge.charged, remaining: charge.remaining };
}

async function logBlockedRuntimeAction(
  input: RuntimeOwnerMeterInput,
  required: number,
  balance: number,
): Promise<void> {
  try {
    const admin = createSupabaseAdmin();
    await admin.from("provider_usage_logs" as never).insert({
      owner_user_id: input.ownerUserId,
      project_id: input.projectId ?? null,
      operation_type: input.actionType,
      provider: input.provider ?? "runtime",
      provider_cost_usd: input.providerCostUsd ?? 0,
      metadata: {
        blocked: true,
        required_action_credits: required,
        balance,
        operation_id: input.operationId,
        ...(input.metadata ?? {}),
      },
    } as never);
  } catch {
    /* best-effort audit */
  }
}

export type ActionCreditUsageWarning = "none" | "warn_80" | "warn_90" | "depleted";

export function actionCreditUsageWarning(
  balance: number,
  planId: string | null | undefined,
): ActionCreditUsageWarning {
  const allowance = monthlyActionCreditsForPlan(planId);
  if (allowance <= 0) return "none";
  const used = Math.max(0, allowance - balance);
  const pct = used / allowance;
  if (balance <= 0) return "depleted";
  if (pct >= 0.9) return "warn_90";
  if (pct >= 0.8) return "warn_80";
  return "none";
}

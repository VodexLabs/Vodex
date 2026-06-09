import { quoteActionCredits } from "@/lib/action-credits/action-credit-pricing";
import { isFreeRuntimeAction } from "@/lib/action-credits/action-catalog";
import { resolveActionCreditBalance } from "@/lib/action-credits/resolve-action-credit-balance";

export type ActionCreditAvailability = {
  available: boolean;
  remaining: number;
  planAllowance: number;
  bonus: number;
  totalAvailable: number;
  resetAt: string | null;
  reason: string | null;
  sourceTable: "action_credit_balances";
  sourceRow: "owner_user_id_null" | "owner_user_id_project_id" | "plan_allowance";
  requiredForAction: number;
  actionType: string | null;
  balanceSource: "user_pool" | "project_override" | "plan_allowance";
};

/**
 * Canonical server-side Action Credit availability (user pool + optional project row).
 * UI and icon generation must use this — not client-only state.
 */
export async function getActionCreditAvailability(
  ownerUserId: string,
  options?: {
    projectId?: string | null;
    actionType?: string | null;
    providerCostUsd?: number | null;
    dynamicFloor?: number | null;
  },
): Promise<ActionCreditAvailability> {
  const actionType = options?.actionType ?? null;
  const resolved = await resolveActionCreditBalance(ownerUserId, {
    projectId: options?.projectId,
  });

  const totalAvailable = resolved.balance;
  const sourceRow: ActionCreditAvailability["sourceRow"] =
    resolved.source === "project_override"
      ? "owner_user_id_project_id"
      : resolved.source === "plan_allowance"
        ? "plan_allowance"
        : "owner_user_id_null";

  let requiredForAction = 0;
  if (actionType && !isFreeRuntimeAction(actionType)) {
    const quote = quoteActionCredits({
      actionType,
      providerCostUsd: options?.providerCostUsd ?? 0,
      dynamicFloor: options?.dynamicFloor ?? undefined,
    });
    requiredForAction = quote.isFree ? 0 : quote.finalActionCredits;
  }

  const available = requiredForAction <= 0 || totalAvailable >= requiredForAction;
  const reason = available
    ? null
    : `insufficient: need ${requiredForAction}, have ${totalAvailable} (${resolved.source})`;

  return {
    available,
    remaining: resolved.balance,
    planAllowance: resolved.planAllowance,
    bonus: resolved.bonus,
    totalAvailable,
    resetAt: resolved.resetAt,
    reason,
    sourceTable: "action_credit_balances",
    sourceRow,
    requiredForAction,
    actionType,
    balanceSource: resolved.source,
  };
}

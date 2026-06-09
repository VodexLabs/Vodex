import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { batchUserLevelActionBalances } from "@/lib/admin/batch-action-balances";
import {
  actionCreditBonusFromBalance,
  monthlyActionCreditsForPlan,
} from "@/lib/action-credits/action-credit-allowances";
import { normalizePlanId } from "@/lib/billing/plans";
import { isE2eCreditTestAccount } from "@/lib/credits/e2e-credit-account";
import { readE2eCreditBypassMarker } from "@/lib/credits/e2e-credit-bypass-server";

export type ActionCreditBalanceResolution = {
  balance: number;
  planAllowance: number;
  bonus: number;
  source: "user_pool" | "project_override" | "plan_allowance";
  resetAt: string | null;
};

/**
 * Canonical user-level Action Credit balance — matches GET /api/credits.
 * Never treat a missing balance row as zero when plan allowance applies.
 */
export async function resolveActionCreditBalance(
  ownerUserId: string,
  options?: { projectId?: string | null },
): Promise<ActionCreditBalanceResolution> {
  const admin = createSupabaseAdmin();
  const projectId = options?.projectId ?? null;

  const { data: profile } = await admin
    .from("profiles")
    .select("plan_id, credits_reset_at, email")
    .eq("id", ownerUserId)
    .maybeSingle();

  const plan = normalizePlanId((profile as { plan_id?: string } | null)?.plan_id ?? "free");
  const planAllowance = monthlyActionCreditsForPlan(plan);
  const resetAt = (profile as { credits_reset_at?: string } | null)?.credits_reset_at ?? null;

  const userPoolMap = await batchUserLevelActionBalances(admin, [ownerUserId]);
  const userPoolBal = userPoolMap.get(ownerUserId);

  let balance: number;
  let source: ActionCreditBalanceResolution["source"];

  if (userPoolBal != null) {
    balance = userPoolBal;
    source = "user_pool";
  } else {
    balance = planAllowance;
    source = "plan_allowance";
  }

  const email = (profile as { email?: string } | null)?.email ?? null;
  const e2eMarker = readE2eCreditBypassMarker();
  if (isE2eCreditTestAccount(email) || (e2eMarker?.userId && e2eMarker.userId === ownerUserId)) {
    const floor = Math.max(e2eMarker?.actionCredits ?? 500, 500);
    balance = Math.max(balance, floor);
  }

  if (projectId) {
    const { data: projRow } = await admin
      .from("action_credit_balances" as never)
      .select("balance")
      .eq("owner_user_id" as never, ownerUserId)
      .eq("project_id" as never, projectId)
      .maybeSingle();
    const projBal = (projRow as { balance?: number } | null)?.balance;
    if (typeof projBal === "number" && projBal > balance) {
      balance = projBal;
      source = "project_override";
    }
  }

  const bonus = actionCreditBonusFromBalance({ balance, planAllowance });

  return { balance, planAllowance, bonus, source, resetAt };
}

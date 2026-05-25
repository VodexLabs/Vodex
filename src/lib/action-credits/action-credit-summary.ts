import type { SupabaseClient } from "@supabase/supabase-js";
import {
  actionCreditBonusFromBalance,
  monthlyActionCreditsForPlan,
} from "@/lib/action-credits/action-credit-allowances";
import { normalizePlanId } from "@/lib/billing/plans";

export type ActionCreditSummary = {
  available: number;
  planAllowance: number;
  bonusCredits: number;
  planId: string;
};

export async function loadActionCreditSummary(
  supabase: SupabaseClient,
  userId: string,
  planId?: string | null,
): Promise<ActionCreditSummary> {
  const plan = normalizePlanId(planId ?? "free");
  const planAllowance = monthlyActionCreditsForPlan(plan);

  const { data } = await supabase
    .from("action_credit_balances" as never)
    .select("balance")
    .eq("owner_user_id" as never, userId)
    .is("project_id" as never, null)
    .maybeSingle();

  const row = data as { balance?: number } | null;
  const available = typeof row?.balance === "number" ? Number(row.balance) : planAllowance;
  const bonusCredits = actionCreditBonusFromBalance({ balance: available, planAllowance });

  return {
    available,
    planAllowance,
    bonusCredits,
    planId: plan,
  };
}

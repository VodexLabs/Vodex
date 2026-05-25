import { monthlyTokensForPlan, normalizePlanId } from "@/lib/billing/plans";
import type { PlanId } from "@/lib/supabase/types";

/** Monthly Action Credit allowances by plan — separate from Build Credits. */
export const ACTION_CREDITS_BY_PLAN: Record<PlanId, number> = {
  free: 25,
  starter: 500,
  pro: 2000,
  business: 5000,
  infinity: 10000,
  enterprise: 10000,
};

export function monthlyActionCreditsForPlan(plan: string | null | undefined): number {
  const id = normalizePlanId(plan ?? "free") as PlanId;
  return ACTION_CREDITS_BY_PLAN[id] ?? ACTION_CREDITS_BY_PLAN.free;
}

export function actionCreditBonusFromBalance(_input: {
  balance: number;
  planAllowance: number;
}): number {
  return 0;
}

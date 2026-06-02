import { monthlyActionCreditsForPlan } from "@/lib/action-credits/action-credit-allowances";
import { monthlyTokensForPlan, normalizePlanId } from "@/lib/billing/plans";
import { isPlanUpgrade } from "@/lib/billing/upgrade-policy";
import type { PlanId } from "@/lib/supabase/types";

export type MidCycleCreditCalc = {
  buildCredits: number;
  actionCredits: number;
  buildUsedThisPeriod: number;
  actionUsedThisPeriod: number;
  midCyclePreserveUsage: boolean;
};

/**
 * Paid → higher paid within the same cycle: do not stack allowances.
 * new_remaining = new_monthly_limit - used_this_period (+ explicit bonuses).
 */
export function computeUpgradeCycleCredits(input: {
  oldPlan: string;
  newPlan: string;
  buildRemainingBefore: number;
  actionRemainingBefore: number;
  explicitBuildBonus: number;
  explicitActionBonus: number;
}): MidCycleCreditCalc {
  const oldPlan = normalizePlanId(input.oldPlan) as PlanId;
  const newPlan = normalizePlanId(input.newPlan) as PlanId;
  const midCyclePreserveUsage =
    oldPlan !== "free" && isPlanUpgrade(oldPlan, newPlan);

  const oldBuildCap = monthlyTokensForPlan(oldPlan) + input.explicitBuildBonus;
  const newBuildCap = monthlyTokensForPlan(newPlan) + input.explicitBuildBonus;
  const oldActionCap = monthlyActionCreditsForPlan(oldPlan) + input.explicitActionBonus;
  const newActionCap = monthlyActionCreditsForPlan(newPlan) + input.explicitActionBonus;

  const buildUsed = midCyclePreserveUsage
    ? Math.max(0, Math.min(oldBuildCap, oldBuildCap - input.buildRemainingBefore))
    : 0;
  const actionUsed = midCyclePreserveUsage
    ? Math.max(0, Math.min(oldActionCap, oldActionCap - input.actionRemainingBefore))
    : 0;

  const buildCredits = midCyclePreserveUsage
    ? Math.max(0, newBuildCap - buildUsed)
    : newBuildCap;
  const actionCredits = midCyclePreserveUsage
    ? Math.max(0, newActionCap - actionUsed)
    : newActionCap;

  return {
    buildCredits,
    actionCredits,
    buildUsedThisPeriod: buildUsed,
    actionUsedThisPeriod: actionUsed,
    midCyclePreserveUsage,
  };
}

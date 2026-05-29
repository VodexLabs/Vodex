import {
  ACTION_CREDITS_BY_PLAN,
  monthlyActionCreditsForPlan as monthlyActionCreditsFromEconomics,
} from "@/lib/billing/plan-credit-economics";

export { ACTION_CREDITS_BY_PLAN };

export function monthlyActionCreditsForPlan(plan: string | null | undefined): number {
  return monthlyActionCreditsFromEconomics(plan);
}

export function actionCreditBonusFromBalance(_input: {
  balance: number;
  planAllowance: number;
}): number {
  return 0;
}

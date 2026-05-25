import { monthlyTokensForPlan, normalizePlanId } from "@/lib/billing/plans";
import type { PlanId } from "@/lib/supabase/types";
import { buildCreditBreakdown } from "@/lib/credits/canonical-credit-display";

export type CreditTruthResult = ReturnType<typeof buildCreditBreakdown> & {
  staleSeedCorrected: boolean;
};

/** @deprecated Prefer loadCanonicalCredits */
export type CreditTruthInput = {
  planId: string | null | undefined;
  creditsRemaining: number | null | undefined;
  creditsLimit?: number | null;
  monthlyTokenLimit?: number | null;
  usedThisPeriod?: number;
  grantEvents?: Array<{ event_type?: string | null; credits_consumed?: number | null }> | null;
  isTestAccount?: boolean;
};

/** @deprecated Prefer buildCreditBreakdown from canonical-credit-display */
export function resolveCreditTruth(
  input: CreditTruthInput,
  opts?: { hasGrantHistory?: boolean },
): CreditTruthResult {
  const grantEvents =
    input.grantEvents ??
    (opts?.hasGrantHistory ? [{ event_type: "grant", credits_consumed: -1 }] : []);
  return buildCreditBreakdown({
    ...input,
    grantEvents,
    isTestAccount: input.isTestAccount,
  });
}

export { monthlyTokensForPlan, normalizePlanId, type PlanId };

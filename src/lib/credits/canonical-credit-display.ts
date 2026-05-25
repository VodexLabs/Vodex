import { monthlyTokensForPlan, normalizePlanId } from "@/lib/billing/plans";
import type { PlanId } from "@/lib/supabase/types";
import { formatCreditAmount } from "@/lib/credits/credit-summary";
import type { CanonicalCreditBucket } from "@/lib/credits/canonical-credits";

export type CreditDisplayLines = {
  primary: string;
  secondary: string[];
};

/** Format canonical bucket for user-facing display. */
export function formatCanonicalCreditDisplay(bucket: CanonicalCreditBucket, label: string): CreditDisplayLines {
  const primary = `${formatCreditAmount(bucket.available)} ${label}`;
  const secondary: string[] = [`${formatCreditAmount(bucket.planAllowance)}/mo plan allowance`];

  if (bucket.bonusActive > 0) {
    secondary.push(`+${formatCreditAmount(bucket.bonusActive)} ${bucket.bonusLabel ?? "bonus"}`);
  }
  if (bucket.usedThisPeriod > 0) {
    secondary.push(`${formatCreditAmount(bucket.usedThisPeriod)} used this period`);
  }
  if (bucket.reserved > 0) {
    secondary.push(`${formatCreditAmount(bucket.reserved)} reserved`);
  }

  return { primary, secondary };
}

/** @deprecated Admin/user display must use loadCanonicalCredits — kept for legacy imports. */
export function buildCreditBreakdown(input: {
  planId: string | null | undefined;
  creditsRemaining: number | null | undefined;
  creditsLimit?: number | null;
  monthlyTokenLimit?: number | null;
  usedThisPeriod?: number;
  reserved?: number;
  resetAt?: string | null;
  grantEvents?: unknown;
  isTestAccount?: boolean;
}) {
  const planId = normalizePlanId(input.planId ?? "free") as PlanId;
  const planAllowance = monthlyTokensForPlan(planId);
  const available = Math.max(0, Number(input.creditsRemaining ?? 0) || 0);
  const bonusActive = 0;
  const usedThisPeriod = Math.max(0, input.usedThisPeriod ?? Math.max(0, planAllowance + bonusActive - available));

  return {
    available,
    planAllowance,
    bonusCredits: bonusActive,
    purchasedCredits: 0,
    usedThisPeriod,
    reserved: Math.max(0, input.reserved ?? 0),
    resetAt: input.resetAt ?? null,
    planId,
    isTestOrGrantAccount: bonusActive > 0,
    staleSeedCorrected: false,
  };
}

export function formatUserCreditDisplay(b: { available: number; planAllowance: number; bonusCredits: number; usedThisPeriod: number; reserved: number }): CreditDisplayLines {
  return formatCanonicalCreditDisplay(
    {
      available: b.available,
      planAllowance: b.planAllowance,
      usedThisPeriod: b.usedThisPeriod,
      bonusActive: b.bonusCredits,
      bonusLabel: b.bonusCredits > 0 ? "top-up" : null,
      bonusExpiresAt: null,
      resetDate: null,
      reserved: b.reserved,
      source: "canonical_balance",
    },
    "available",
  );
}

export function formatAdminCreditDisplay(b: { available: number; planAllowance: number; bonusCredits: number; usedThisPeriod: number; reserved: number; resetAt?: string | null }): CreditDisplayLines {
  const lines = formatCanonicalCreditDisplay(
    {
      available: b.available,
      planAllowance: b.planAllowance,
      usedThisPeriod: b.usedThisPeriod,
      bonusActive: b.bonusCredits,
      bonusLabel: b.bonusCredits > 0 ? "top-up" : null,
      bonusExpiresAt: null,
      resetDate: b.resetAt ?? null,
      reserved: b.reserved,
      source: "canonical_balance",
    },
    "available",
  );
  if (b.resetAt) lines.secondary.push(`Reset: ${new Date(b.resetAt).toLocaleDateString()}`);
  return lines;
}

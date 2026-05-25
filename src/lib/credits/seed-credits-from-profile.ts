import { monthlyTokensForPlan, normalizePlanId } from "@/lib/billing/plans";
import { monthlyActionCreditsForPlan } from "@/lib/action-credits/action-credit-allowances";
import type { CanonicalCreditsPayload } from "@/lib/credits/canonical-credits";
import { useCreditsStore } from "@/lib/stores/credits-store";
import type { Profile } from "@/lib/supabase/types";

/** Instant credits/plan from profile row — full sync refines later. */
export function seedCreditsFromProfile(profile: Partial<Profile>): void {
  const planId = normalizePlanId(profile.plan_id ?? "free") as CanonicalCreditsPayload["planId"];
  const buildAllowance = monthlyTokensForPlan(planId);
  const actionAllowance = monthlyActionCreditsForPlan(planId);
  const buildAvailable =
    typeof profile.credits_remaining === "number"
      ? profile.credits_remaining
      : buildAllowance;

  useCreditsStore.getState().applyCanonical({
    planId,
    build: {
      available: buildAvailable,
      planAllowance: buildAllowance,
      usedThisPeriod: Math.max(0, buildAllowance - buildAvailable),
      bonusActive: 0,
      bonusLabel: null,
      bonusExpiresAt: null,
      resetDate: profile.credits_reset_at ?? null,
      reserved: 0,
      source: "canonical_balance",
    },
    action: {
      available: actionAllowance,
      planAllowance: actionAllowance,
      usedThisPeriod: 0,
      bonusActive: 0,
      bonusLabel: null,
      bonusExpiresAt: null,
      resetDate: profile.credits_reset_at ?? null,
      reserved: 0,
      source: "canonical_balance",
    },
  });
}

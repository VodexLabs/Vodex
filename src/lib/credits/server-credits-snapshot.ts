import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizePlanId } from "@/lib/billing/plans";
import { monthlyActionCreditsForPlan } from "@/lib/action-credits/action-credit-allowances";
import {
  loadCanonicalCreditsLite,
  type CanonicalCreditsPayload,
} from "@/lib/credits/canonical-credits";

/** Server-side credits for instant client paint (same data as GET /api/credits?lite=1). */
export async function loadServerCreditsSnapshot(
  userId: string,
): Promise<CanonicalCreditsPayload | null> {
  if (!userId) return null;

  try {
    const admin = createSupabaseAdmin();
    const [{ data: profile }, { data: actionRow }] = await Promise.all([
      admin
        .from("profiles")
        .select("plan_id, credits_remaining, credits_reset_at")
        .eq("id", userId)
        .maybeSingle(),
      admin
        .from("action_credit_balances" as never)
        .select("balance")
        .eq("owner_user_id" as never, userId)
        .is("project_id" as never, null)
        .maybeSingle(),
    ]);

    if (!profile || typeof profile.credits_remaining !== "number") {
      return null;
    }

    const planId = normalizePlanId(profile.plan_id ?? "free");
    const actionPlanAllowance = monthlyActionCreditsForPlan(planId);
    const actionBalance = (actionRow as { balance: number } | null)?.balance;
    const actionAvailable =
      typeof actionBalance === "number" ? actionBalance : actionPlanAllowance;

    return loadCanonicalCreditsLite({
      planId: profile.plan_id,
      creditsResetAt: profile.credits_reset_at,
      buildAvailable: profile.credits_remaining,
      actionAvailable,
    });
  } catch {
    return null;
  }
}

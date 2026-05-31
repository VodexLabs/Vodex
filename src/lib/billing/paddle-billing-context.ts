import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CatalogBillingInterval } from "@/lib/billing/plan-billing-catalog";
import {
  PROFILE_PADDLE_BILLING_SELECT,
  readProfilePaddleSubscriptionId,
} from "@/lib/billing/paddle-profile-fields";
import { fetchSubscriptionByPaddleId } from "@/lib/billing/paddle-subscription-legacy-store";
import { normalizePlanId } from "@/lib/billing/plans";
import type { PlanId } from "@/lib/supabase/types";

export type PaddleBillingContext = {
  userId: string;
  email: string;
  currentPlanId: PlanId;
  currentInterval: CatalogBillingInterval | null;
  paddleSubscriptionId: string | null;
  paddleCustomerId: string | null;
  hasActiveSubscription: boolean;
  pendingDowngradePlan: PlanId | null;
  subscriptionStatus: string | null;
};

export async function loadPaddleBillingContextForUser(
  userId: string,
  email: string,
): Promise<PaddleBillingContext> {
  const admin = createSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select(
      `plan_id, subscription_status, ${PROFILE_PADDLE_BILLING_SELECT}, paddle_customer_id`,
    )
    .eq("id", userId)
    .maybeSingle();

  const currentPlanId = normalizePlanId(profile?.plan_id ?? "free");
  const paddleSubscriptionId = readProfilePaddleSubscriptionId(profile ?? undefined);
  let currentInterval: CatalogBillingInterval | null = null;
  let pendingDowngradePlan: PlanId | null = null;

  if (paddleSubscriptionId) {
    const sub = await fetchSubscriptionByPaddleId(
      admin,
      paddleSubscriptionId,
      "plan_interval, pending_downgrade_plan",
    );
    if (sub?.plan_interval === "yearly") currentInterval = "annual";
    else if (sub?.plan_interval === "monthly") currentInterval = "monthly";
    if (sub?.pending_downgrade_plan) {
      pendingDowngradePlan = normalizePlanId(sub.pending_downgrade_plan);
    }
  }

  return {
    userId,
    email,
    currentPlanId,
    currentInterval,
    paddleSubscriptionId,
    paddleCustomerId:
      typeof profile?.paddle_customer_id === "string" ? profile.paddle_customer_id : null,
    hasActiveSubscription: Boolean(paddleSubscriptionId),
    pendingDowngradePlan,
    subscriptionStatus:
      typeof profile?.subscription_status === "string" ? profile.subscription_status : null,
  };
}

/** Session-scoped loader for API routes. */
export async function loadPaddleBillingContextFromSession(): Promise<
  | { ok: true; ctx: PaddleBillingContext }
  | { ok: false; error: "unauthorized" | "no_email" }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const email = user.email?.trim();
  if (!email) return { ok: false, error: "no_email" };
  const ctx = await loadPaddleBillingContextForUser(user.id, email);
  return { ok: true, ctx };
}

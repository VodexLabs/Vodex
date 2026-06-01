/**
 * Separates profile plan display from real Paddle subscription state.
 */
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import {
  PROFILE_PADDLE_BILLING_SELECT,
  readProfilePaddleSubscriptionId,
} from "@/lib/billing/paddle-profile-fields";
import { fetchSubscriptionByPaddleId } from "@/lib/billing/paddle-subscription-legacy-store";
import { normalizePlanId } from "@/lib/billing/plans";
import type { PlanId } from "@/lib/supabase/types";
import { resolveUnifiedBillingAction } from "@/lib/billing/unified-billing-action";
import type { BillablePlanId, CatalogBillingInterval } from "@/lib/billing/plan-billing-catalog";

export type PlanSource = "paddle" | "admin_override" | "manual_grant" | "free" | "unknown";

export type BillingState =
  | "free"
  | "admin_granted"
  | "paddle_active"
  | "paddle_missing_subscription"
  | "inconsistent";

export type RecommendedBillingAction =
  | "create_checkout"
  | "update_subscription"
  | "open_portal"
  | "repair_from_paddle"
  | "block_same_plan"
  | "none";

const PADDLE_MANAGEABLE_STATUSES = new Set(["active", "trialing", "past_due"]);

const ADMIN_EVENT_HINTS = [
  "admin",
  "grant",
  "manual",
  "owner",
  "test",
  "debug",
  "credit",
];

export type BillingTruth = {
  profilePlan: PlanId;
  effectivePlan: PlanId;
  planSource: PlanSource;
  isAdminGranted: boolean;
  hasPaddleCustomer: boolean;
  hasPaddleSubscription: boolean;
  paddleCustomerId: string | null;
  paddleSubscriptionId: string | null;
  paddleSubscriptionStatus: string | null;
  billingProvider: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  billingState: BillingState;
  recommendedAction: RecommendedBillingAction;
  canUpgradeViaPaddleSubscription: boolean;
  canCreateNewCheckout: boolean;
  visibleWarningMessage: string | null;
  billingTruthCase: "A" | "B" | "C" | "D" | null;
  billingTruthSummary: string;
  lastEntitlementEventAt: string | null;
  lastEntitlementEventType: string | null;
  lastWebhookEventAt: string | null;
  lastWebhookEventType: string | null;
  lastBillingAttemptId: string | null;
};

export async function loadBillingTruthForUser(userId: string): Promise<BillingTruth> {
  const admin = createSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select(
      `plan_id, subscription_status, credits_reset_at, billing_provider, ${PROFILE_PADDLE_BILLING_SELECT}, paddle_customer_id`,
    )
    .eq("id", userId)
    .maybeSingle();

  const profilePlan = normalizePlanId(profile?.plan_id ?? "free");
  const paddleSubscriptionId = readProfilePaddleSubscriptionId(profile ?? undefined);
  const paddleCustomerId =
    typeof profile?.paddle_customer_id === "string" && profile.paddle_customer_id.trim()
      ? profile.paddle_customer_id.trim()
      : null;
  const subscriptionStatus =
    typeof profile?.subscription_status === "string" ? profile.subscription_status : null;
  const billingProvider =
    typeof profile?.billing_provider === "string" ? profile.billing_provider : null;

  let currentPeriodStart: string | null = null;
  let currentPeriodEnd: string | null = profile?.credits_reset_at ?? null;

  if (paddleSubscriptionId) {
    const sub = await fetchSubscriptionByPaddleId(
      admin,
      paddleSubscriptionId,
      "current_period_start, current_period_end, status",
    );
    if (sub?.current_period_start) currentPeriodStart = sub.current_period_start;
    if (sub?.current_period_end) currentPeriodEnd = sub.current_period_end;
  }

  const { data: recentEvents } = await admin
    .from("billing_events")
    .select("event_type, created_at, stripe_event_id, metadata")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);

  const rows = recentEvents ?? [];
  const entitlementRow = rows.find((e) => e.event_type === "paddle.entitlement.applied");
  const paddleWebhookRow = rows.find((e) => String(e.event_type ?? "").startsWith("paddle."));
  const attemptRow = rows.find((e) => e.event_type === "paddle.billing.attempt");
  const adminHintRow = rows.find((e) => {
    const t = String(e.event_type ?? "").toLowerCase();
    return ADMIN_EVENT_HINTS.some((h) => t.includes(h));
  });

  const hasPaddleSubscription = Boolean(paddleSubscriptionId?.trim());
  const subscriptionManageable =
    hasPaddleSubscription &&
    (subscriptionStatus == null || PADDLE_MANAGEABLE_STATUSES.has(subscriptionStatus));

  const planSource = resolvePlanSource({
    profilePlan,
    hasPaddleSubscription: subscriptionManageable,
    billingProvider,
    hasPaddleEntitlement: Boolean(entitlementRow),
    hasAdminHint: Boolean(adminHintRow) && !entitlementRow,
  });

  const billingState = resolveBillingState({
    profilePlan,
    planSource,
    hasPaddleSubscription: subscriptionManageable,
    billingProvider,
  });

  const isAdminGranted =
    planSource === "admin_override" ||
    planSource === "manual_grant" ||
    billingState === "admin_granted";

  const { caseId, summary, warning } = buildTruthNarrative({
    profilePlan,
    planSource,
    billingState,
    hasPaddleSubscription: subscriptionManageable,
    paddleSubscriptionId,
  });

  const recommendedAction = recommendAction(billingState, profilePlan);
  const canUpgradeViaPaddleSubscription = subscriptionManageable;
  const canCreateNewCheckout =
    !subscriptionManageable || billingState === "admin_granted" || billingState === "inconsistent";

  let lastBillingAttemptId: string | null = null;
  if (attemptRow?.metadata) {
    const meta = attemptRow.metadata as Record<string, unknown>;
    const trace = meta.trace as { billing_attempt_id?: string } | undefined;
    lastBillingAttemptId = trace?.billing_attempt_id ?? null;
  }

  return {
    profilePlan,
    effectivePlan: profilePlan,
    planSource,
    isAdminGranted,
    hasPaddleCustomer: Boolean(paddleCustomerId),
    hasPaddleSubscription: subscriptionManageable,
    paddleCustomerId,
    paddleSubscriptionId: paddleSubscriptionId ?? null,
    paddleSubscriptionStatus: subscriptionStatus,
    billingProvider,
    currentPeriodStart,
    currentPeriodEnd,
    billingState,
    recommendedAction,
    canUpgradeViaPaddleSubscription,
    canCreateNewCheckout,
    visibleWarningMessage: warning,
    billingTruthCase: caseId,
    billingTruthSummary: summary,
    lastEntitlementEventAt: entitlementRow?.created_at ?? null,
    lastEntitlementEventType: entitlementRow?.event_type ?? null,
    lastWebhookEventAt: paddleWebhookRow?.created_at ?? null,
    lastWebhookEventType: paddleWebhookRow?.event_type ?? null,
    lastBillingAttemptId,
  };
}

function resolvePlanSource(input: {
  profilePlan: PlanId;
  hasPaddleSubscription: boolean;
  billingProvider: string | null;
  hasPaddleEntitlement: boolean;
  hasAdminHint: boolean;
}): PlanSource {
  if (input.profilePlan === "free") return "free";

  if (input.hasPaddleSubscription && input.hasPaddleEntitlement) {
    return "paddle";
  }

  if (input.hasPaddleSubscription) {
    return "paddle";
  }

  if (input.billingProvider === "paddle" && !input.hasPaddleSubscription) {
    return "unknown";
  }

  if (input.hasAdminHint || input.billingProvider !== "paddle") {
    return input.hasAdminHint ? "admin_override" : "admin_override";
  }

  if (String(input.profilePlan) !== "free" && !input.hasPaddleSubscription) {
    return "admin_override";
  }

  return "unknown";
}

function resolveBillingState(input: {
  profilePlan: PlanId;
  planSource: PlanSource;
  hasPaddleSubscription: boolean;
  billingProvider: string | null;
}): BillingState {
  if (input.profilePlan === "free") return "free";

  if (input.hasPaddleSubscription && input.planSource === "paddle") {
    return "paddle_active";
  }

  if (
    String(input.profilePlan) !== "free" &&
    !input.hasPaddleSubscription &&
    input.billingProvider === "paddle"
  ) {
    return "paddle_missing_subscription";
  }

  if (String(input.profilePlan) !== "free" && !input.hasPaddleSubscription) {
    return "admin_granted";
  }

  if (input.planSource === "unknown") {
    return "inconsistent";
  }

  return "inconsistent";
}

function buildTruthNarrative(input: {
  profilePlan: PlanId;
  planSource: PlanSource;
  billingState: BillingState;
  hasPaddleSubscription: boolean;
  paddleSubscriptionId: string | null;
}): {
  caseId: "A" | "B" | "C" | "D" | null;
  summary: string;
  warning: string | null;
} {
  if (input.billingState === "free") {
    return {
      caseId: "D",
      summary: "Free account — no paid plan on profile.",
      warning: null,
    };
  }

  if (input.billingState === "paddle_active" && input.hasPaddleSubscription) {
    return {
      caseId: "B",
      summary:
        "Real Paddle subscriber detected. Plan changes use subscription update (upgrade/change-plan), not a blind new checkout.",
      warning: null,
    };
  }

  if (input.billingState === "admin_granted" || input.planSource === "admin_override") {
    return {
      caseId: "A",
      summary:
        `Internal ${input.profilePlan} only — no real Paddle subscription exists. This user was likely upgraded manually in admin or via grants. Paddle cannot upgrade this as an existing subscription. The next action will create a new checkout to establish a real Paddle subscription.`,
      warning:
        "Profile shows a paid plan, but Paddle has no active subscription ID. Do not treat the plan badge as proof of paid billing.",
    };
  }

  if (input.billingState === "paddle_missing_subscription" || input.billingState === "inconsistent") {
    return {
      caseId: "C",
      summary:
        `Inconsistent billing state: profile says ${input.profilePlan}, billing_provider may reference Paddle, but subscription id is ${input.paddleSubscriptionId ?? "missing"}. Repair from Paddle, create checkout, or clear admin override.`,
      warning:
        "Billing state is inconsistent. Paid UI may not match Paddle. Use checkout to create a real subscription or repair from Paddle dashboard.",
    };
  }

  return {
    caseId: null,
    summary: "Billing state could not be classified — inspect billing events.",
    warning: "Unknown billing state — verify profile and Paddle dashboard manually.",
  };
}

function recommendAction(billingState: BillingState, profilePlan: PlanId): RecommendedBillingAction {
  switch (billingState) {
    case "paddle_active":
      return "update_subscription";
    case "admin_granted":
    case "paddle_missing_subscription":
    case "inconsistent":
      return "create_checkout";
    case "free":
      return profilePlan === "free" ? "create_checkout" : "create_checkout";
    default:
      return "none";
  }
}

/** Resolve plan change with billing truth surfaced on the resolution. */
export function resolveBillingActionWithTruth(input: {
  truth: BillingTruth;
  targetPlan: BillablePlanId;
  targetInterval: CatalogBillingInterval;
}) {
  const resolution = resolveUnifiedBillingAction({
    currentPlanId: input.truth.profilePlan,
    currentInterval: null,
    targetPlan: input.targetPlan,
    targetInterval: input.targetInterval,
    paddleSubscriptionId: input.truth.paddleSubscriptionId,
  });

  let explanation = resolution.description;
  if (!input.truth.hasPaddleSubscription && input.truth.profilePlan !== "free") {
    explanation = `No Paddle subscription on file (internal ${input.truth.profilePlan} only). ${resolution.unifiedAction === "checkout" ? "Next step creates a new Paddle checkout." : resolution.description}`;
  }

  return { ...resolution, explanation };
}

export function checkoutButtonLabel(truth: BillingTruth): string {
  if (truth.hasPaddleSubscription) {
    return "Upgrade existing Paddle subscription";
  }
  if (truth.isAdminGranted || truth.billingState === "admin_granted") {
    return "Create Paddle subscription for internally upgraded user";
  }
  if (truth.profilePlan === "free") {
    return "Create real Paddle subscription";
  }
  return "Create real Paddle subscription";
}

export function checkoutButtonWarning(truth: BillingTruth): string | null {
  if (truth.hasPaddleSubscription) return null;
  if (truth.profilePlan !== "free") {
    return "This will create a new real Paddle subscription because this user does not currently have one. Internal plan badges do not count as paid Paddle billing.";
  }
  return "Opens Paddle checkout to start a new paid subscription.";
}

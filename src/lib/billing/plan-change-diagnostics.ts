/**
 * Human-readable reasons a Paddle checkout / webhook may not have updated plan entitlements.
 */
export type PlanChangeDiagnosticInput = {
  profilePlanId: string;
  subscriptionStatus?: string | null;
  paddleConfigured: boolean;
  paddleEnvironment?: string;
  webhookPending?: boolean;
  entitlementApplied?: boolean;
  lastWebhookStatus?: string | null;
  lastWebhookEventType?: string | null;
  lastWebhookError?: string | null;
  transactionId?: string | null;
  recentEventTypes?: string[];
};

export function buildPlanChangeDiagnostics(input: PlanChangeDiagnosticInput): string[] {
  const reasons: string[] = [];

  if (!input.paddleConfigured) {
    reasons.push("Paddle is not fully configured — check PADDLE_API_KEY and price IDs in environment.");
  }

  if (input.webhookPending) {
    reasons.push(
      "Payment may have completed, but no processed Paddle webhook was recorded for this checkout yet.",
    );
    reasons.push(
      `Confirm Paddle Dashboard → Developer Tools → Notifications points to your app webhook (e.g. /api/webhooks/paddle). Local dev cannot receive production webhooks unless you tunnel (ngrok) or test on the deployed site.`,
    );
  }

  if (input.lastWebhookStatus === "missing_custom_data" || input.lastWebhookError === "missing_user_id") {
    reasons.push(
      "Webhook arrived without user_id in custom_data — checkout must attach server-built custom_data (user_id, plan_id, price_id).",
    );
  }

  if (input.lastWebhookStatus === "unknown_price_id" || input.lastWebhookError === "unknown_price_id") {
    reasons.push(
      "Webhook price_id is not mapped in the DreamOS86 catalog — verify PADDLE_*_PRICE_ID env vars match Paddle Dashboard.",
    );
  }

  if (input.lastWebhookStatus === "failed") {
    reasons.push(
      `Webhook handler failed: ${input.lastWebhookError ?? "see billing_events metadata in Supabase"}.`,
    );
  }

  if (input.lastWebhookStatus === "received_simulation_or_unlinked") {
    reasons.push("Last webhook was a simulation or had no linkable user — entitlement was not applied.");
  }

  if (input.lastWebhookStatus === "payment_failed_no_upgrade") {
    reasons.push("Payment failed or subscription is past due — plan was not upgraded.");
  }

  if (input.subscriptionStatus === "past_due") {
    reasons.push("Subscription is past due — resolve payment in the Paddle customer portal.");
  }

  if (!input.entitlementApplied && input.profilePlanId === "free" && !input.webhookPending) {
    reasons.push(
      "Profile is still on Free and no entitlement.applied audit event was found — complete checkout or verify webhook delivery.",
    );
  }

  if (input.transactionId && !input.lastWebhookEventType) {
    reasons.push(
      `No webhook events linked to transaction ${input.transactionId} yet — wait a few seconds or check Paddle notification logs.`,
    );
  }

  if (input.recentEventTypes?.length) {
    reasons.push(`Recent billing events: ${input.recentEventTypes.slice(0, 5).join(", ")}.`);
  } else {
    reasons.push("No recent Paddle billing_events rows for this user — webhooks may not be reaching this Supabase project.");
  }

  if (input.paddleEnvironment === "production" && process.env.NODE_ENV === "development") {
    reasons.push(
      "You are on production Paddle from localhost — webhooks fire to the production URL, not your local server.",
    );
  }

  return reasons;
}

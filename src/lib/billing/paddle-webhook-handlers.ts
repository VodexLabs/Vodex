import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { syncPlanCreditsForUser } from "@/lib/billing/sync-plan-credits";
import { normalizePlanId } from "@/lib/billing/plans";
import type { PlanId } from "@/lib/supabase/types";

function planFromPaddlePrice(priceId: string | undefined): PlanId {
  if (!priceId) return "free";
  if (priceId === process.env.PADDLE_STARTER_PRICE_ID?.trim()) return "starter";
  if (priceId === process.env.PADDLE_PRO_PRICE_ID?.trim()) return "pro";
  if (priceId === process.env.PADDLE_INFINITY_PRICE_ID?.trim()) return "infinity";
  return "pro";
}

function periodEndFromEvent(data: Record<string, unknown>): string {
  const end = data.current_billing_period as { ends_at?: string } | undefined;
  if (end?.ends_at) return end.ends_at;
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
}

export async function handlePaddleSubscriptionEvent(input: {
  eventType: string;
  data: Record<string, unknown>;
  paddleEventId: string;
}): Promise<void> {
  const admin = createSupabaseAdmin();
  const custom = (input.data.custom_data ?? {}) as Record<string, string>;
  const userId = custom.user_id;
  if (!userId) return;

  const status = String(input.data.status ?? "");
  const priceId =
    (input.data.items as Array<{ price?: { id?: string } }> | undefined)?.[0]?.price?.id ??
    (input.data.price_id as string | undefined);
  const planId = normalizePlanId(custom.plan_id ?? planFromPaddlePrice(priceId));
  const periodEnd = periodEndFromEvent(input.data);
  const subscriptionId = String(input.data.id ?? "");

  if (
    input.eventType === "subscription.activated" ||
    input.eventType === "subscription.created" ||
    input.eventType === "subscription.updated"
  ) {
    if (status === "active" || status === "trialing") {
      await syncPlanCreditsForUser({
        userId,
        planId,
        periodEndIso: periodEnd,
        source: `paddle:${input.eventType}`,
        metadata: { paddle_event_id: input.paddleEventId, subscription_id: subscriptionId },
      });

      await admin.from("billing_events").insert({
        user_id: userId,
        stripe_event_id: input.paddleEventId,
        event_type: `paddle.${input.eventType}`,
        amount_usd: 0,
        stripe_customer_id: null,
        stripe_subscription_id: subscriptionId || null,
      });

      await admin.from("notifications").insert({
        user_id: userId,
        type: "credit",
        title: "Plan activated",
        body: `Your ${planId} plan is active. Monthly Build and Action Credits have been refreshed.`,
        action_url: "/settings/billing",
      });
    }
  }

  if (input.eventType === "subscription.canceled" || status === "canceled") {
    await admin
      .from("profiles")
      .update({ plan_id: "free", stripe_subscription_id: null })
      .eq("id", userId);
    await syncPlanCreditsForUser({
      userId,
      planId: "free",
      periodEndIso: periodEnd,
      source: `paddle:${input.eventType}`,
      metadata: { paddle_event_id: input.paddleEventId },
    });
  }
}

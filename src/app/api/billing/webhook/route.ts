import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import type { PlanId } from "@/lib/supabase/types";

const PLAN_IDS: readonly PlanId[] = ["free", "pro", "business", "enterprise"];

function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as readonly string[]).includes(value);
}

function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | undefined {
  const inv = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };
  const ref = inv.subscription;
  if (typeof ref === "string") return ref;
  if (ref && typeof ref === "object" && "id" in ref) return ref.id;
  return undefined;
}

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const planId = session.metadata?.plan_id;
      const credits = parseInt(session.metadata?.credits ?? "0", 10);
      const interval = session.metadata?.interval ?? "monthly";

      if (!userId || !planId || !isPlanId(planId)) break;

      const billingInterval = interval === "yearly" ? "yearly" : "monthly";

      // Update profile plan + grant initial credits
      await supabase.from("profiles").update({
        plan_id: planId,
        plan_interval: billingInterval,
        credits_remaining: credits,
        credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        stripe_subscription_id: session.subscription as string,
      }).eq("id", userId);

      // Record credit grant in ledger
      await supabase.from("credit_events").insert({
        user_id: userId,
        operation_id: `subscription_start_${session.id}`,
        model_id: "system",
        credits_consumed: -credits,
        event_type: "grant",
      });

      // Record billing event
      await supabase.from("billing_events").insert({
        user_id: userId,
        stripe_event_id: event.id,
        event_type: "checkout.session.completed",
        amount_usd: session.amount_total ? session.amount_total / 100 : 0,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
      });

      // Notify user
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "credit",
        title: "Plan activated",
        body: `Your ${planId} plan is now active. ${credits} credits added.`,
        action_url: "/credits",
      });

      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = subscriptionIdFromInvoice(invoice);
      if (!subscriptionId) break;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = subscription.metadata?.user_id;
      const credits = parseInt(subscription.metadata?.credits ?? "0", 10);

      if (!userId || !credits) break;

      // Reset credits on renewal
      await supabase.from("profiles").update({
        credits_remaining: credits,
        credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq("id", userId);

      await supabase.from("credit_events").insert({
        user_id: userId,
        operation_id: `renewal_${invoice.id}`,
        model_id: "system",
        credits_consumed: -credits,
        event_type: "reset",
      });

      await supabase.from("billing_events").insert({
        user_id: userId,
        stripe_event_id: event.id,
        event_type: "invoice.paid",
        amount_usd: invoice.amount_paid / 100,
        stripe_customer_id: invoice.customer as string,
        stripe_subscription_id: subscriptionId,
      });

      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;
      if (!userId) break;

      await supabase.from("profiles").update({
        plan_id: "free",
        credits_remaining: 0,
        stripe_subscription_id: null,
      }).eq("id", userId);

      await supabase.from("notifications").insert({
        user_id: userId,
        type: "credit",
        title: "Subscription canceled",
        body: "Your subscription has ended. Upgrade to continue using premium features.",
        action_url: "/pricing",
      });

      break;
    }
  }

  return NextResponse.json({ received: true });
}

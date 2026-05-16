import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { z } from "zod";

const schema = z.object({
  planId: z.enum(["pro", "business"]),
  interval: z.enum(["monthly", "yearly"]),
  credits: z.number().int().min(100),
});

// Price IDs map — set these in your env vars
const PRICE_MAP: Record<string, Record<string, string>> = {
  pro: {
    monthly_100: process.env.STRIPE_PRICE_PRO_MONTHLY_100 ?? "",
    monthly_200: process.env.STRIPE_PRICE_PRO_MONTHLY_200 ?? "",
    monthly_400: process.env.STRIPE_PRICE_PRO_MONTHLY_400 ?? "",
    monthly_800: process.env.STRIPE_PRICE_PRO_MONTHLY_800 ?? "",
    monthly_1200: process.env.STRIPE_PRICE_PRO_MONTHLY_1200 ?? "",
    monthly_2000: process.env.STRIPE_PRICE_PRO_MONTHLY_2000 ?? "",
    yearly_100: process.env.STRIPE_PRICE_PRO_YEARLY_100 ?? "",
    yearly_200: process.env.STRIPE_PRICE_PRO_YEARLY_200 ?? "",
  },
  business: {
    monthly_100: process.env.STRIPE_PRICE_BUSINESS_MONTHLY_100 ?? "",
    monthly_200: process.env.STRIPE_PRICE_BUSINESS_MONTHLY_200 ?? "",
    monthly_400: process.env.STRIPE_PRICE_BUSINESS_MONTHLY_400 ?? "",
    monthly_800: process.env.STRIPE_PRICE_BUSINESS_MONTHLY_800 ?? "",
    yearly_100: process.env.STRIPE_PRICE_BUSINESS_YEARLY_100 ?? "",
    yearly_200: process.env.STRIPE_PRICE_BUSINESS_YEARLY_200 ?? "",
  },
};

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { planId, interval, credits } = parsed.data;
  const priceKey = `${interval}_${credits}`;
  const priceId = PRICE_MAP[planId]?.[priceKey];

  if (!priceId) {
    return NextResponse.json({ error: "Price not found for this tier" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, stripe_customer_id")
    .eq("id", user.id)
    .single();

  // Get or create Stripe customer
  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing`,
    metadata: {
      user_id: user.id,
      plan_id: planId,
      interval,
      credits: String(credits),
    },
    subscription_data: {
      metadata: {
        user_id: user.id,
        plan_id: planId,
        credits: String(credits),
      },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}

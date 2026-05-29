import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createPaddleCheckoutSession } from "@/lib/billing/paddle-api";
import { getPaddleBillingStatus, type PaddleCheckoutPlan } from "@/lib/billing/paddle-billing";
import { PLAN_DISPLAY, monthlyTokensForPlan } from "@/lib/billing/plans";
import { monthlyActionCreditsForPlan } from "@/lib/action-credits/action-credit-allowances";

const schema = z.object({
  planId: z.enum(["starter", "pro", "infinity"]),
  confirmed: z.literal(true),
});

const CHECKOUT_PLANS: PaddleCheckoutPlan[] = ["starter", "pro", "infinity"];

export async function POST(request: Request) {
  const status = getPaddleBillingStatus();
  if (!status.configured) {
    return NextResponse.json(
      {
        error: status.userMessage,
        code: "setup_required",
        missingEnv: status.missing,
        paddle: status,
      },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Confirm upgrade details before checkout." }, { status: 400 });
  }

  if (!CHECKOUT_PLANS.includes(parsed.data.planId)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const { getAppUrl } = await import("@/lib/app-url");
  const appUrl = getAppUrl();
  const email = user.email ?? "";
  if (!email) {
    return NextResponse.json({ error: "Account email required for checkout" }, { status: 400 });
  }

  const result = await createPaddleCheckoutSession({
    planId: parsed.data.planId,
    userId: user.id,
    email,
    successUrl: `${appUrl}/settings/billing?paddle=success`,
    cancelUrl: `${appUrl}/settings/billing?paddle=canceled`,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        code: result.code,
        missingEnv: result.missing,
        paddle: getPaddleBillingStatus(),
      },
      { status: result.code === "setup_required" ? 503 : 502 },
    );
  }

  const display = PLAN_DISPLAY[parsed.data.planId];
  return NextResponse.json({
    url: result.checkoutUrl,
    transactionId: result.transactionId,
    plan: {
      id: parsed.data.planId,
      name: display.name,
      buildCredits: monthlyTokensForPlan(parsed.data.planId),
      actionCredits: monthlyActionCreditsForPlan(parsed.data.planId),
      priceMonthlyUsd: display.priceMonthlyUsd,
    },
    billingProvider: "paddle",
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getPaddleBillingStatus } from "@/lib/billing/paddle-billing";
import { loadPaddleBillingContextFromSession } from "@/lib/billing/paddle-billing-context";
import { executePaddleBillingAction } from "@/lib/billing/execute-paddle-billing-action";
import { normalizeBillablePlanId } from "@/lib/billing/plan-billing-catalog";
import {
  billingPeriodEndFromNow,
  fullPlanPriceUsd,
  isPlanUpgrade,
  UPGRADE_POLICY_COPY,
} from "@/lib/billing/upgrade-policy";
import { billablePlanDefinition, billablePlanToPlanId } from "@/lib/billing/plan-billing-catalog";
import { monthlyTokensForPlan, normalizePlanId, PLAN_DISPLAY } from "@/lib/billing/plans";
import { monthlyActionCreditsForPlan } from "@/lib/action-credits/action-credit-allowances";

const schema = z.object({
  planId: z.string(),
  interval: z
    .enum(["monthly", "yearly", "annual"])
    .optional()
    .default("monthly")
    .transform((v) => (v === "annual" ? "yearly" : v)),
  confirmed: z.literal(true),
});

export async function POST(request: Request) {
  const status = getPaddleBillingStatus();
  if (!status.configured) {
    return NextResponse.json(
      { error: status.userMessage, code: "setup_required", paddle: status },
      { status: 503 },
    );
  }

  const session = await loadPaddleBillingContextFromSession();
  if (!session.ok) {
    if (session.error === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Account email required" }, { status: 400 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Confirm upgrade details before continuing." }, { status: 400 });
  }

  const catalogInterval = parsed.data.interval === "yearly" ? "annual" : "monthly";
  const billable = normalizeBillablePlanId(parsed.data.planId);
  if (!billable) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const targetStoragePlan = billablePlanToPlanId(billable);
  if (!isPlanUpgrade(session.ctx.currentPlanId, targetStoragePlan)) {
    return NextResponse.json({ error: "Target plan must be higher than your current plan." }, { status: 400 });
  }

  const result = await executePaddleBillingAction({
    ctx: session.ctx,
    targetPlan: billable,
    targetInterval: catalogInterval,
    source: "billing_page",
  });

  const fallbackPreview = {
    currentPlan: {
      id: session.ctx.currentPlanId,
      name: PLAN_DISPLAY[session.ctx.currentPlanId]?.name ?? session.ctx.currentPlanId,
    },
    newPlan: {
      id: targetStoragePlan,
      name: billablePlanDefinition(billable).label,
      buildCredits: monthlyTokensForPlan(targetStoragePlan),
      actionCredits: monthlyActionCreditsForPlan(targetStoragePlan),
    },
    amountDueTodayUsd: fullPlanPriceUsd(billable, parsed.data.interval),
    newRenewalDate: billingPeriodEndFromNow(parsed.data.interval),
    policyMessage: UPGRADE_POLICY_COPY.upgradeSummary,
  };
  const preview =
    result.ok && result.mode !== "scheduled_downgrade" && "preview" in result
      ? result.preview
      : fallbackPreview;

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code, preview },
      { status: result.httpStatus },
    );
  }

  if (result.mode === "paddle_checkout") {
    return NextResponse.json({
      mode: "paddle_checkout",
      url: result.url,
      transactionId: result.transactionId,
      preview,
      message: "Complete checkout — plan updates after verified webhook only.",
      billingProvider: "paddle",
    });
  }

  if (result.mode === "paddle_subscription_update") {
    return NextResponse.json({
      mode: result.mode,
      subscriptionId: result.subscriptionId,
      preview: result.preview,
      message: result.message,
      billingProvider: "paddle",
      webhookRequired: true,
    });
  }

  return NextResponse.json({
    mode: result.mode,
    preview,
    billingProvider: "paddle",
    webhookRequired: true,
  });
}

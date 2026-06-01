import { NextResponse } from "next/server";
import { z } from "zod";
import {
  billablePlanToPlanId,
  normalizeBillablePlanId,
} from "@/lib/billing/plan-billing-catalog";
import {
  captureBillingSnapshot,
  createBillingAttempt,
} from "@/lib/billing/billing-attempt-trace";
import { loadBillingTruthForUser } from "@/lib/billing/billing-truth";
import { loadPaddleBillingContextFromSession } from "@/lib/billing/paddle-billing-context";
import { resolveUnifiedBillingAction } from "@/lib/billing/unified-billing-action";

const schema = z.object({
  plan: z.string(),
  interval: z.enum(["monthly", "annual"]).default("monthly"),
});

/** Create billing attempt immediately when user clicks — before Paddle call. */
export async function POST(request: Request) {
  const session = await loadPaddleBillingContextFromSession();
  if (!session.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const billable = normalizeBillablePlanId(parsed.data.plan);
  if (!billable) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const truth = await loadBillingTruthForUser(session.ctx.userId);
  const before = await captureBillingSnapshot(session.ctx.userId);
  const resolution = resolveUnifiedBillingAction({
    currentPlanId: session.ctx.currentPlanId,
    currentInterval: session.ctx.currentInterval,
    targetPlan: billable,
    targetInterval: parsed.data.interval,
    paddleSubscriptionId: session.ctx.paddleSubscriptionId,
  });

  const billingAttemptId = await createBillingAttempt({
    userId: session.ctx.userId,
    targetPlan: billable,
    before,
    planSourceAtClick: truth.planSource,
    profilePlanAtClick: truth.profilePlan,
    hasPaddleSubscriptionAtClick: truth.hasPaddleSubscription,
    frontendStarted: true,
    resolvedAction: resolution.unifiedAction,
    endpointCalled: undefined,
  });

  return NextResponse.json({
    billingAttemptId,
    billingTruth: truth,
    planChange: {
      action: resolution.unifiedAction,
      apiRoute: resolution.apiRoute,
      description: resolution.description,
      hasActiveSubscription: resolution.hasActiveSubscription,
    },
    targetStoragePlan: billablePlanToPlanId(billable),
    warning: truth.visibleWarningMessage,
    noPaddleSubscriptionInternalPlan:
      !truth.hasPaddleSubscription && truth.profilePlan !== "free",
  });
}

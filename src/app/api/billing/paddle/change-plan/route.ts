import { NextResponse } from "next/server";
import { z } from "zod";
import { getPaddleBillingStatus } from "@/lib/billing/paddle-billing";
import { loadPaddleBillingContextFromSession } from "@/lib/billing/paddle-billing-context";
import { executePaddleBillingAction } from "@/lib/billing/execute-paddle-billing-action";
import { normalizeBillablePlanId } from "@/lib/billing/plan-billing-catalog";

const schema = z.object({
  plan: z.string(),
  interval: z.enum(["monthly", "annual"]),
  confirmed: z.literal(true),
});

/** Plan change (upgrade / downgrade / interval) — unified executor. */
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
    return NextResponse.json({ error: "Confirm plan change before continuing." }, { status: 400 });
  }

  const billable = normalizeBillablePlanId(parsed.data.plan);
  if (!billable) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const result = await executePaddleBillingAction({
    ctx: session.ctx,
    targetPlan: billable,
    targetInterval: parsed.data.interval,
    source: "billing_page",
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        code: result.code,
        planChange: {
          action: result.resolution.unifiedAction,
          description: result.resolution.description,
        },
      },
      { status: result.httpStatus },
    );
  }

  if (result.mode === "scheduled_downgrade") {
    return NextResponse.json({
      mode: result.mode,
      pendingDowngradePlan: result.pendingDowngradePlan,
      currentPeriodEnd: result.currentPeriodEnd,
      policyMessage: result.resolution.description,
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
    mode: "paddle_checkout",
    url: result.url,
    transactionId: result.transactionId,
    billingProvider: "paddle",
    webhookRequired: true,
  });
}

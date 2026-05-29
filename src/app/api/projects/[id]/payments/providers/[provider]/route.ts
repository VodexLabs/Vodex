import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadProfileBillingRow } from "@/lib/supabase/load-profile-billing";
import type { PaymentProviderId } from "@/lib/generated-app-payments/types";
import {
  assertProjectOwner,
  deletePaymentConnection,
  writePaymentAudit,
} from "@/lib/generated-app-payments/connection-store";
import { canConnectAppPayments, paymentsGateMessage } from "@/lib/generated-app-payments/plan-gate";

const VALID: PaymentProviderId[] = ["paddle", "stripe", "lemon_squeezy", "paypal", "revenuecat"];

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string; provider: string }> },
) {
  const { id: projectId, provider: providerRaw } = await ctx.params;
  if (!VALID.includes(providerRaw as PaymentProviderId)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  const provider = providerRaw as PaymentProviderId;

  let body: { confirm?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    /* optional body */
  }
  if (!body.confirm) {
    return NextResponse.json(
      { error: "Send { confirm: true } to delete this connection" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertProjectOwner(projectId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { row: billing } = await loadProfileBillingRow(supabase, user);
  if (!canConnectAppPayments(billing?.plan_id)) {
    return NextResponse.json({ error: paymentsGateMessage(), code: "plan_required" }, { status: 402 });
  }

  await deletePaymentConnection(projectId, provider);
  await writePaymentAudit({
    projectId,
    userId: user.id,
    provider,
    action: "delete",
    status: "ok",
  });

  return NextResponse.json({ ok: true });
}

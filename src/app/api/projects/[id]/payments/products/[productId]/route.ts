import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadProfileBillingRow } from "@/lib/supabase/load-profile-billing";
import {
  assertProjectOwner,
  deletePaymentProduct,
  upsertPaymentProduct,
  writePaymentAudit,
} from "@/lib/generated-app-payments/connection-store";
import { canConnectAppPayments, paymentsGateMessage } from "@/lib/generated-app-payments/plan-gate";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; productId: string }> },
) {
  const { id: projectId, productId } = await ctx.params;
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

  const body = await req.json();
  const product = await upsertPaymentProduct({
    projectId,
    productId,
    provider: String(body.provider ?? ""),
    productType: String(body.productType ?? "subscription"),
    name: String(body.name ?? "Product"),
    description: typeof body.description === "string" ? body.description : undefined,
    externalProductId: typeof body.externalProductId === "string" ? body.externalProductId : undefined,
    externalPriceId: typeof body.externalPriceId === "string" ? body.externalPriceId : undefined,
    localEntitlementKey:
      typeof body.localEntitlementKey === "string" ? body.localEntitlementKey : undefined,
    amountCents: typeof body.amountCents === "number" ? body.amountCents : undefined,
    currency: typeof body.currency === "string" ? body.currency : undefined,
    interval: body.interval === "month" || body.interval === "year" ? body.interval : null,
  });

  await writePaymentAudit({
    projectId,
    userId: user.id,
    provider: String(body.provider ?? ""),
    action: "product_update",
    status: "ok",
  });

  return NextResponse.json({ ok: true, product });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; productId: string }> },
) {
  const { id: projectId, productId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertProjectOwner(projectId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deletePaymentProduct(projectId, productId);
  return NextResponse.json({ ok: true });
}

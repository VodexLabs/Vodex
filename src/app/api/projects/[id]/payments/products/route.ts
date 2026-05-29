import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  assertProjectOwner,
  listPaymentProducts,
  upsertPaymentProduct,
  writePaymentAudit,
} from "@/lib/generated-app-payments/connection-store";
import { canConnectAppPayments, paymentsGateMessage } from "@/lib/generated-app-payments/plan-gate";
import { loadProfileBillingRow } from "@/lib/supabase/load-profile-billing";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertProjectOwner(projectId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const products = await listPaymentProducts(projectId);
  return NextResponse.json({ ok: true, products });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params;
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
    action: "product_create",
    status: "ok",
  });

  return NextResponse.json({ ok: true, product });
}

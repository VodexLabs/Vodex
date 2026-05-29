import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PaymentProviderId } from "@/lib/generated-app-payments/types";
import {
  assertProjectOwner,
  disablePaymentConnection,
  writePaymentAudit,
} from "@/lib/generated-app-payments/connection-store";

const VALID: PaymentProviderId[] = ["paddle", "stripe", "lemon_squeezy", "paypal", "revenuecat"];

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string; provider: string }> },
) {
  const { id: projectId, provider: providerRaw } = await ctx.params;
  if (!VALID.includes(providerRaw as PaymentProviderId)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  const provider = providerRaw as PaymentProviderId;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertProjectOwner(projectId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await disablePaymentConnection(projectId, provider);
  await writePaymentAudit({
    projectId,
    userId: user.id,
    provider,
    action: "disable",
    status: "ok",
  });

  return NextResponse.json({ ok: true });
}

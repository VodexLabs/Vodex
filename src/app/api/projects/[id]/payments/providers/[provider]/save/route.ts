import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadProfileBillingRow } from "@/lib/supabase/load-profile-billing";
import type { PaymentProviderId } from "@/lib/generated-app-payments/types";
import {
  assertProjectOwner,
  savePaymentConnection,
  writePaymentAudit,
} from "@/lib/generated-app-payments/connection-store";
import { canConnectAppPayments, paymentsGateMessage } from "@/lib/generated-app-payments/plan-gate";

const VALID: PaymentProviderId[] = ["paddle", "stripe", "lemon_squeezy", "paypal", "revenuecat"];

export async function POST(
  req: Request,
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

  const { row: billing } = await loadProfileBillingRow(supabase, user);
  if (!canConnectAppPayments(billing?.plan_id)) {
    return NextResponse.json({ error: paymentsGateMessage(), code: "plan_required" }, { status: 402 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mode =
    body.mode === "live" || body.mode === "sandbox" ? body.mode : "test";
  const secrets =
    body.secrets && typeof body.secrets === "object"
      ? (body.secrets as Record<string, string>)
      : undefined;
  const publicConfig =
    body.publicConfig && typeof body.publicConfig === "object"
      ? (body.publicConfig as Record<string, unknown>)
      : undefined;

  const row = await savePaymentConnection({
    projectId,
    ownerUserId: user.id,
    provider,
    mode,
    displayName: typeof body.displayName === "string" ? body.displayName : undefined,
    accountEmail: typeof body.accountEmail === "string" ? body.accountEmail : undefined,
    secrets,
    publicConfig,
    productMapping:
      body.productMapping && typeof body.productMapping === "object"
        ? (body.productMapping as Record<string, unknown>)
        : undefined,
    webhookConfig:
      body.webhookConfig && typeof body.webhookConfig === "object"
        ? (body.webhookConfig as Record<string, unknown>)
        : undefined,
  });

  await writePaymentAudit({
    projectId,
    userId: user.id,
    provider,
    action: "save",
    status: "ok",
  });

  return NextResponse.json({
    ok: true,
    connection: {
      provider: row.provider,
      status: row.status,
      mode: row.mode,
    },
  });
}

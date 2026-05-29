import { createClient } from "@/lib/supabase/server";
import { loadProfileBillingRow } from "@/lib/supabase/load-profile-billing";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import {
  assertProjectOwner,
  getDecryptedSecrets,
  listPaymentConnections,
  writePaymentAudit,
} from "@/lib/generated-app-payments/connection-store";
import { canConnectAppPayments, paymentsGateMessage } from "@/lib/generated-app-payments/plan-gate";
import { createProviderTestCheckout } from "@/lib/generated-app-payments/providers/index";
import type { PaymentProviderId } from "@/lib/generated-app-payments/types";
import { getAppUrl } from "@/lib/app-url";

const WEB: PaymentProviderId[] = ["paddle", "stripe", "lemon_squeezy", "paypal"];

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("unauthorized", "Unauthorized", 401);
    if (!(await assertProjectOwner(projectId, user.id, supabase))) {
      return jsonError("not_found", "Not found", 404);
    }

    const { row: billing } = await loadProfileBillingRow(supabase, user);
    if (!canConnectAppPayments(billing?.plan_id)) {
      return jsonError("plan_required", paymentsGateMessage(), 402);
    }

    const body = (await req.json()) as {
      provider?: string;
      priceId?: string;
      confirmLive?: boolean;
    };
    const provider = body.provider as PaymentProviderId;
    if (!WEB.includes(provider)) {
      return jsonError("invalid_provider", "Invalid provider", 400);
    }

    const rows = await listPaymentConnections(projectId);
    const conn = rows.find((r) => r.provider === provider);
    if (!conn || conn.status === "not_connected" || conn.status === "disabled") {
      return jsonError("not_connected", "Connect this provider first", 400);
    }

    if (conn.mode === "live" && !body.confirmLive) {
      return jsonError(
        "live_confirm_required",
        "Set confirmLive: true to run a live-mode checkout test",
        400,
      );
    }

    const secrets = await getDecryptedSecrets(projectId, provider);
    const priceId = body.priceId?.trim();
    if (!priceId) {
      return jsonError("price_required", "external price/variant ID required", 400);
    }

    const base = getAppUrl();
    const checkout = await createProviderTestCheckout({
      provider,
      secrets,
      mode: conn.mode,
      priceId,
      successUrl: `${base}/apps/${projectId}/dashboard?checkout=success`,
      cancelUrl: `${base}/apps/${projectId}/dashboard?checkout=cancel`,
      projectId,
    });

    if (!checkout.url) {
      return jsonError("checkout_failed", checkout.error ?? "Could not create checkout", 400);
    }

    await writePaymentAudit({
      projectId,
      userId: user.id,
      provider,
      action: "test_checkout",
      status: "ok",
    });

    return jsonOk({ checkoutUrl: checkout.url, sessionId: checkout.sessionId ?? null });
  } catch (err) {
    console.error("[payments/test-checkout]", err);
    return jsonError(
      "internal_error",
      err instanceof Error ? err.message : "Test checkout failed",
      500,
    );
  }
}

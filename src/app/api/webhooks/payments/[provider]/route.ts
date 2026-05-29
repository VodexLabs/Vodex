import { NextResponse } from "next/server";
import { processPaymentWebhook } from "@/lib/generated-app-payments/webhook-processor";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import type { PaymentProviderId } from "@/lib/generated-app-payments/types";

const VALID: PaymentProviderId[] = ["paddle", "stripe", "lemon_squeezy", "paypal", "revenuecat"];

function normalizeProvider(raw: string): PaymentProviderId | null {
  if (raw === "lemon-squeezy") return "lemon_squeezy";
  if (VALID.includes(raw as PaymentProviderId)) return raw as PaymentProviderId;
  return null;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider: providerRaw } = await ctx.params;
    const provider = normalizeProvider(providerRaw);
    if (!provider) {
      return jsonError("unknown_provider", "Unknown payment provider", 400);
    }

    const rawBody = await req.text();
    const projectId = req.headers.get("x-dreamos-project-id");

    const result = await processPaymentWebhook({
      provider,
      rawBody,
      headers: req.headers,
      projectIdHint: projectId,
    });

    if (!result.ok) {
      return jsonError("webhook_rejected", result.error ?? "Webhook rejected", 400);
    }

    return jsonOk({ received: true, processed: result.processed });
  } catch (err) {
    console.error("[payment-webhook]", err);
    return jsonOk({ received: true, processed: false, warning: "logged" });
  }
}

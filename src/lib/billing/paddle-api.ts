import { createHmac, timingSafeEqual } from "node:crypto";
import {
  getPaddlePriceId,
  missingPaddleEnvVars,
  paddleBillingConfigured,
  type PaddleCheckoutPlan,
} from "@/lib/billing/paddle-billing";

const PADDLE_API_BASE =
  process.env.PADDLE_API_ENV === "sandbox"
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";

export type PaddleCheckoutResult =
  | { ok: true; checkoutUrl: string; transactionId?: string }
  | { ok: false; code: "setup_required" | "api_error"; error: string; missing?: string[] };

export async function createPaddleCheckoutSession(input: {
  planId: PaddleCheckoutPlan;
  userId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<PaddleCheckoutResult> {
  if (!paddleBillingConfigured()) {
    return {
      ok: false,
      code: "setup_required",
      error: "Paddle billing is not configured yet.",
      missing: missingPaddleEnvVars(),
    };
  }

  const priceId = getPaddlePriceId(input.planId);
  if (!priceId) {
    return {
      ok: false,
      code: "setup_required",
      error: `Paddle price ID missing for plan ${input.planId}`,
      missing: [`PADDLE_${input.planId.toUpperCase()}_PRICE_ID`],
    };
  }

  const apiKey = process.env.PADDLE_API_KEY!.trim();

  try {
    const res = await fetch(`${PADDLE_API_BASE}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        customer: { email: input.email },
        custom_data: { user_id: input.userId, plan_id: input.planId },
        checkout: {
          url: input.successUrl,
        },
      }),
    });

    const json = (await res.json()) as {
      data?: { checkout?: { url?: string }; id?: string };
      error?: { detail?: string };
    };

    if (!res.ok) {
      return {
        ok: false,
        code: "api_error",
        error: json.error?.detail ?? `Paddle API ${res.status}`,
      };
    }

    const checkoutUrl = json.data?.checkout?.url;
    if (!checkoutUrl) {
      return { ok: false, code: "api_error", error: "Paddle did not return a checkout URL" };
    }

    return { ok: true, checkoutUrl, transactionId: json.data?.id };
  } catch (e) {
    return {
      ok: false,
      code: "api_error",
      error: e instanceof Error ? e.message : "Paddle request failed",
    };
  }
}

/** Verify Paddle-Signature header (Paddle Billing webhooks). */
export function verifyPaddleWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader?.trim() || !secret.trim()) return false;
  try {
    const parts = Object.fromEntries(
      signatureHeader.split(";").map((p) => {
        const [k, v] = p.trim().split("=");
        return [k, v];
      }),
    );
    const ts = parts.ts;
    const h1 = parts.h1;
    if (!ts || !h1) return false;
    const payload = `${ts}:${rawBody}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    return timingSafeEqual(Buffer.from(h1), Buffer.from(expected));
  } catch {
    return false;
  }
}

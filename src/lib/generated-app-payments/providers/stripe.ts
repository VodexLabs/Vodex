import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentConnectionMode } from "@/lib/generated-app-payments/types";

export type ProviderSecrets = Record<string, string>;

export type CheckoutResult = { url: string | null; sessionId?: string; error?: string };

export async function verifyStripeConfig(secrets: ProviderSecrets): Promise<{ ok: boolean; message: string }> {
  const sk = secrets.secret_key?.trim();
  const pk = secrets.publishable_key?.trim();
  if (!sk?.startsWith("sk_")) {
    return { ok: false, message: "Stripe secret key must start with sk_" };
  }
  if (!pk?.startsWith("pk_")) {
    return { ok: false, message: "Stripe publishable key must start with pk_" };
  }
  try {
    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${sk}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err as { error?: { message?: string } })?.error?.message ?? res.statusText;
      return { ok: false, message: `Stripe rejected keys: ${msg}` };
    }
    return { ok: true, message: "Stripe account verified" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Stripe verify failed" };
  }
}

export async function createStripeCheckout(input: {
  secrets: ProviderSecrets;
  mode: PaymentConnectionMode;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}): Promise<CheckoutResult> {
  const sk = input.secrets.secret_key?.trim();
  if (!sk) return { url: null, error: "Stripe not configured" };

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", input.successUrl);
  body.set("cancel_url", input.cancelUrl);
  body.set("line_items[0][price]", input.priceId);
  body.set("line_items[0][quantity]", "1");
  if (input.customerEmail) body.set("customer_email", input.customerEmail);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sk}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = (await res.json()) as { url?: string; id?: string; error?: { message?: string } };
  if (!res.ok) {
    return { url: null, error: data.error?.message ?? "Checkout failed" };
  }
  return { url: data.url ?? null, sessionId: data.id };
}

export function verifyStripeWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  try {
    const parts = signature.split(",").reduce(
      (acc, p) => {
        const [k, v] = p.split("=");
        if (k === "t") acc.t = v;
        if (k.startsWith("v1")) acc.v1.push(v);
        return acc;
      },
      { t: "", v1: [] as string[] },
    );
    if (!parts.t || parts.v1.length === 0) return false;
    const signed = `${parts.t}.${payload}`;
    const expected = createHmac("sha256", secret).update(signed, "utf8").digest("hex");
    return parts.v1.some((v) => {
      try {
        return timingSafeEqual(Buffer.from(v), Buffer.from(expected));
      } catch {
        return v === expected;
      }
    });
  } catch {
    return false;
  }
}

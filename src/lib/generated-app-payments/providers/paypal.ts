import type { ProviderSecrets, CheckoutResult } from "@/lib/generated-app-payments/providers/stripe";
import type { PaymentConnectionMode } from "@/lib/generated-app-payments/types";

async function paypalToken(secrets: ProviderSecrets, live: boolean): Promise<string | null> {
  const base = live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secrets.client_id}:${secrets.client_secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export async function verifyPaypalConfig(
  secrets: ProviderSecrets,
  mode: PaymentConnectionMode,
): Promise<{ ok: boolean; message: string }> {
  if (!secrets.client_id?.trim() || !secrets.client_secret?.trim()) {
    return { ok: false, message: "PayPal client ID and secret required" };
  }
  const token = await paypalToken(secrets, mode === "live");
  if (!token) return { ok: false, message: "PayPal credentials rejected" };
  return { ok: true, message: "PayPal credentials verified" };
}

export async function createPaypalCheckout(input: {
  secrets: ProviderSecrets;
  mode: PaymentConnectionMode;
  planId?: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<CheckoutResult> {
  const live = input.mode === "live";
  const token = await paypalToken(input.secrets, live);
  if (!token) return { url: null, error: "PayPal auth failed" };
  const base = live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const res = await fetch(`${base}/v1/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ amount: { currency_code: "USD", value: "1.00" } }],
      application_context: {
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    }),
  });
  const data = (await res.json()) as { id?: string; links?: Array<{ rel: string; href: string }> };
  const approve = data.links?.find((l) => l.rel === "approve");
  return { url: approve?.href ?? null, sessionId: data.id };
}

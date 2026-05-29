import { createHmac, timingSafeEqual } from "node:crypto";
import type { ProviderSecrets, CheckoutResult } from "@/lib/generated-app-payments/providers/stripe";
import type { PaymentConnectionMode } from "@/lib/generated-app-payments/types";

export function verifyLemonSqueezyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  try {
    const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return signature === expected;
    }
  } catch {
    return false;
  }
}

export async function verifyLemonSqueezyConfig(
  secrets: ProviderSecrets,
): Promise<{ ok: boolean; message: string }> {
  const key = secrets.api_key?.trim();
  const storeId = secrets.store_id?.trim();
  if (!key) return { ok: false, message: "API key required" };
  if (!storeId) return { ok: false, message: "Store ID required" };
  try {
    const res = await fetch(`https://api.lemonsqueezy.com/v1/stores/${storeId}`, {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/vnd.api+json",
      },
    });
    if (!res.ok) {
      return { ok: false, message: "Lemon Squeezy rejected credentials" };
    }
    return { ok: true, message: "Lemon Squeezy store verified" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Verify failed" };
  }
}

export async function createLemonSqueezyCheckout(input: {
  secrets: ProviderSecrets;
  mode: PaymentConnectionMode;
  variantId: string;
  successUrl: string;
}): Promise<CheckoutResult> {
  const key = input.secrets.api_key?.trim();
  const storeId = input.secrets.store_id?.trim();
  if (!key || !storeId) return { url: null, error: "Not configured" };

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_options: { embed: false },
          checkout_data: { custom: { success_url: input.successUrl } },
          product_options: { redirect_url: input.successUrl },
        },
        relationships: {
          store: { data: { type: "stores", id: storeId } },
          variant: { data: { type: "variants", id: input.variantId } },
        },
      },
    }),
  });

  const data = (await res.json()) as {
    data?: { attributes?: { url?: string } };
    errors?: Array<{ detail?: string }>;
  };
  if (!res.ok) {
    return { url: null, error: data.errors?.[0]?.detail ?? "Checkout failed" };
  }
  return { url: data.data?.attributes?.url ?? null };
}

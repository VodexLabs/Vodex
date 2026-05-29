import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentConnectionMode } from "@/lib/generated-app-payments/types";
import type { ProviderSecrets, CheckoutResult } from "@/lib/generated-app-payments/providers/stripe";

function paddleApiBase(mode: PaymentConnectionMode): string {
  return "https://api.paddle.com";
}

export async function verifyPaddleConfig(secrets: ProviderSecrets): Promise<{ ok: boolean; message: string }> {
  const key = secrets.api_key?.trim();
  if (!key || key.length < 8) {
    return { ok: false, message: "Paddle API key is required" };
  }
  try {
    const res = await fetch(`${paddleApiBase("test")}/products?per_page=1`, {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: "Paddle rejected API key" };
    }
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { detail?: string } };
      return { ok: false, message: err.error?.detail ?? `Paddle API error (${res.status})` };
    }
    return { ok: true, message: "Paddle API key accepted" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Paddle verify failed" };
  }
}

export async function createPaddleCheckout(input: {
  secrets: ProviderSecrets;
  mode: PaymentConnectionMode;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  projectId?: string;
}): Promise<CheckoutResult> {
  const key = input.secrets.api_key?.trim();
  if (!key) return { url: null, error: "Paddle API key not configured" };

  const body: Record<string, unknown> = {
    items: [{ price_id: input.priceId, quantity: 1 }],
    collection_mode: "automatic",
    checkout: {
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    },
  };
  if (input.projectId) {
    body.custom_data = { project_id: input.projectId };
  }

  try {
    const res = await fetch(`${paddleApiBase(input.mode === "live" ? "live" : "test")}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as {
      data?: { checkout?: { url?: string }; id?: string };
      error?: { detail?: string };
    };

    if (!res.ok) {
      return { url: null, error: data.error?.detail ?? "Paddle checkout failed" };
    }

    const url = data.data?.checkout?.url ?? null;
    return { url, sessionId: data.data?.id };
  } catch (e) {
    return { url: null, error: e instanceof Error ? e.message : "Paddle checkout failed" };
  }
}

export function verifyPaddleWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;
  try {
    const parts = signatureHeader.split(";").reduce(
      (acc, part) => {
        const [k, v] = part.split("=");
        if (k === "ts") acc.ts = v;
        if (k === "h1") acc.h1 = v;
        return acc;
      },
      { ts: "", h1: "" },
    );
    if (!parts.ts || !parts.h1) return false;
    const signed = `${parts.ts}:${rawBody}`;
    const expected = createHmac("sha256", secret).update(signed, "utf8").digest("hex");
    try {
      return timingSafeEqual(Buffer.from(parts.h1), Buffer.from(expected));
    } catch {
      return parts.h1 === expected;
    }
  } catch {
    return false;
  }
}

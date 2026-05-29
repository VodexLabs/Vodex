import {
  storeWebhookEvent,
  getDecryptedSecrets,
} from "@/lib/generated-app-payments/connection-store";
import {
  getProjectOwnerId,
  insertRevenueEventIfNew,
  normalizeStripeEvent,
  normalizePaddleEvent,
  normalizeLemonSqueezyEvent,
  normalizePaypalEvent,
  readCustomProjectId,
} from "@/lib/generated-app-payments/revenue-ledger";
import { syncCustomerSubscriptionEntitlement } from "@/lib/generated-app-payments/subscription-sync";
import { verifyStripeWebhookSignature } from "@/lib/generated-app-payments/providers/stripe";
import {
  verifyPaddleWebhookSignature,
} from "@/lib/generated-app-payments/providers/paddle";
import { verifyLemonSqueezyWebhookSignature } from "@/lib/generated-app-payments/providers/lemon-squeezy";
import type { PaymentProviderId } from "@/lib/generated-app-payments/types";
import type { NormalizedRevenueEvent } from "@/lib/generated-app-payments/revenue-ledger";
import { createServiceRoleClient } from "@/lib/supabase/admin";

function extractProjectId(
  payload: Record<string, unknown>,
  hint: string | null,
): string | null {
  if (hint) return hint;
  return readCustomProjectId(payload);
}

async function markWebhookVerified(projectId: string, provider: PaymentProviderId) {
  const admin = createServiceRoleClient();
  await admin
    ?.from("payment_provider_connections" as never)
    .update({
      status: "webhook_verified",
      updated_at: new Date().toISOString(),
    } as never)
    .eq("project_id", projectId)
    .eq("provider", provider);
}

async function processNormalized(
  event: NormalizedRevenueEvent,
  provider: PaymentProviderId,
): Promise<boolean> {
  const inserted = await insertRevenueEventIfNew(event);
  if (inserted) {
    await syncCustomerSubscriptionEntitlement(event);
    await markWebhookVerified(event.projectId, provider);
  }
  return inserted;
}

export async function processPaymentWebhook(input: {
  provider: PaymentProviderId;
  rawBody: string;
  headers: Headers;
  projectIdHint?: string | null;
}): Promise<{ ok: boolean; processed: boolean; error?: string }> {
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(input.rawBody) as Record<string, unknown>;
  } catch {
    payload = { raw: input.rawBody.slice(0, 4000) };
  }

  const eventId =
    String(payload.id ?? payload.event_id ?? "") ||
    input.headers.get("stripe-signature")?.slice(0, 40) ||
    null;
  const meta = payload.meta as { event_name?: string } | undefined;
  const eventType = String(payload.type ?? payload.event_type ?? meta?.event_name ?? "unknown");

  let projectId = extractProjectId(payload, input.projectIdHint ?? null);

  try {
    await storeWebhookEvent({
      projectId,
      provider: input.provider,
      eventId,
      eventType,
      payload,
    });
  } catch {
    /* duplicate ok */
  }

  if (!projectId) {
    return { ok: true, processed: false, error: "no_project_id" };
  }

  const ownerUserId = await getProjectOwnerId(projectId);
  if (!ownerUserId) {
    return { ok: true, processed: false, error: "owner_not_found" };
  }

  let normalized: NormalizedRevenueEvent | null = null;

  if (input.provider === "stripe") {
    const secrets = await getDecryptedSecrets(projectId, "stripe");
    const sig = input.headers.get("stripe-signature");
    if (secrets.webhook_secret && sig) {
      if (!verifyStripeWebhookSignature(input.rawBody, sig, secrets.webhook_secret)) {
        return { ok: false, processed: false, error: "invalid_signature" };
      }
    }
    normalized = normalizeStripeEvent(payload, projectId, ownerUserId, null);
  }

  if (input.provider === "paddle") {
    const secrets = await getDecryptedSecrets(projectId, "paddle");
    const sig = input.headers.get("paddle-signature");
    if (secrets.webhook_secret && sig) {
      if (!verifyPaddleWebhookSignature(input.rawBody, sig, secrets.webhook_secret)) {
        return { ok: false, processed: false, error: "invalid_signature" };
      }
    }
    normalized = normalizePaddleEvent(payload, projectId, ownerUserId, null);
  }

  if (input.provider === "lemon_squeezy") {
    const secrets = await getDecryptedSecrets(projectId, "lemon_squeezy");
    const sig = input.headers.get("x-signature");
    if (secrets.webhook_secret && sig) {
      if (!verifyLemonSqueezyWebhookSignature(input.rawBody, sig, secrets.webhook_secret)) {
        return { ok: false, processed: false, error: "invalid_signature" };
      }
    }
    normalized = normalizeLemonSqueezyEvent(payload, projectId, ownerUserId, null);
    if (normalized && normalized.projectId !== projectId) {
      projectId = normalized.projectId;
    }
  }

  if (input.provider === "paypal") {
    normalized = normalizePaypalEvent(payload, projectId, ownerUserId, null);
  }

  if (normalized) {
    const inserted = await processNormalized(normalized, input.provider);
    return { ok: true, processed: inserted };
  }

  return { ok: true, processed: false };
}

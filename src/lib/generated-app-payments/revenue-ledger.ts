import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { PaymentProviderId } from "@/lib/generated-app-payments/types";

export type NormalizedRevenueEvent = {
  projectId: string;
  ownerUserId: string;
  provider: PaymentProviderId;
  externalEventId: string;
  externalCustomerId?: string | null;
  externalSubscriptionId?: string | null;
  externalCheckoutId?: string | null;
  eventType: string;
  amountCents: number;
  currency: string;
  status: string;
  localEntitlementKey?: string | null;
  occurredAt: string;
  rawEventId?: string | null;
};

function admin() {
  const c = createServiceRoleClient();
  if (!c) throw new Error("Service role unavailable");
  return c;
}

export async function insertRevenueEventIfNew(event: NormalizedRevenueEvent): Promise<boolean> {
  const { error } = await admin().from("generated_app_revenue_events" as never).insert({
    project_id: event.projectId,
    owner_user_id: event.ownerUserId,
    provider: event.provider,
    external_event_id: event.externalEventId,
    external_customer_id: event.externalCustomerId ?? null,
    external_subscription_id: event.externalSubscriptionId ?? null,
    external_checkout_id: event.externalCheckoutId ?? null,
    event_type: event.eventType,
    amount_cents: event.amountCents,
    currency: event.currency,
    status: event.status,
    local_entitlement_key: event.localEntitlementKey ?? null,
    occurred_at: event.occurredAt,
    raw_event_id: event.rawEventId ?? null,
  } as never);

  if (error?.message?.includes("duplicate")) return false;
  if (error && !/duplicate|unique/i.test(error.message)) {
    console.warn("[revenue-ledger] insert failed:", error.message);
    return false;
  }
  return true;
}

export function normalizeStripeEvent(
  payload: Record<string, unknown>,
  projectId: string,
  ownerUserId: string,
  rawEventId: string | null,
): NormalizedRevenueEvent | null {
  const type = String(payload.type ?? "");
  const data = payload.data as { object?: Record<string, unknown> } | undefined;
  const obj = data?.object ?? {};
  const id = String(payload.id ?? obj.id ?? "");
  if (!id) return null;

  let amountCents = 0;
  let eventType = type;
  let status = "succeeded";

  if (type === "checkout.session.completed") {
    amountCents = Number(obj.amount_total ?? 0);
    eventType = "payment";
  } else if (type === "invoice.paid") {
    amountCents = Number((obj as { amount_paid?: number }).amount_paid ?? 0);
    eventType = "subscription_payment";
  } else if (type === "charge.refunded") {
    amountCents = -Math.abs(Number((obj as { amount_refunded?: number }).amount_refunded ?? 0));
    eventType = "refund";
    status = "refunded";
  } else if (type.startsWith("customer.subscription")) {
    amountCents = 0;
    eventType = type;
    status = String(obj.status ?? "updated");
  } else {
    return null;
  }

  return {
    projectId,
    ownerUserId,
    provider: "stripe",
    externalEventId: id,
    externalCustomerId: String(obj.customer ?? "") || null,
    externalSubscriptionId: String(obj.subscription ?? "") || null,
    externalCheckoutId: type.includes("checkout") ? String(obj.id ?? "") : null,
    eventType,
    amountCents,
    currency: String(obj.currency ?? "usd").toUpperCase(),
    status,
    occurredAt: new Date((Number(obj.created ?? Date.now() / 1000)) * 1000).toISOString(),
    rawEventId,
  };
}

export function readCustomProjectId(payload: Record<string, unknown>): string | null {
  const data = payload.data as Record<string, unknown> | undefined;
  const custom =
    (data?.custom_data as Record<string, unknown> | undefined) ??
    (payload.custom_data as Record<string, unknown> | undefined);
  if (custom && typeof custom.project_id === "string") return custom.project_id;
  const meta = payload.metadata as Record<string, unknown> | undefined;
  if (meta && typeof meta.project_id === "string") return meta.project_id;
  return null;
}

export function normalizePaddleEvent(
  payload: Record<string, unknown>,
  projectId: string,
  ownerUserId: string,
  rawEventId: string | null,
): NormalizedRevenueEvent | null {
  const eventId = String(payload.event_id ?? payload.id ?? "");
  const eventType = String(payload.event_type ?? payload.type ?? "");
  const data = (payload.data ?? {}) as Record<string, unknown>;
  if (!eventId) return null;

  let amountCents = 0;
  let status = "succeeded";
  let normalizedType = eventType;

  if (/transaction\.(completed|paid)/i.test(eventType)) {
    const details = (data.details as Record<string, unknown> | undefined)?.totals as
      | Record<string, unknown>
      | undefined;
    amountCents = Number(details?.total ?? data.total ?? data.amount ?? 0);
    normalizedType = "payment";
  } else if (/transaction\.payment_failed/i.test(eventType)) {
    amountCents = 0;
    status = "failed";
    normalizedType = "payment_failed";
  } else if (/subscription\.(created|activated)/i.test(eventType)) {
    const billing = (data.billing_details as Record<string, unknown> | undefined) ?? data;
    const unitPrice = billing?.unit_price as { amount?: number } | undefined;
    amountCents = Number(unitPrice?.amount ?? 0);
    normalizedType = "subscription_created";
  } else if (/subscription\.(updated|renewed)/i.test(eventType)) {
    amountCents = Number((data as { recurring_transaction_details?: { totals?: { total?: number } } })
      ?.recurring_transaction_details?.totals?.total ?? 0);
    normalizedType = "subscription_payment";
  } else if (/subscription\.(canceled|cancelled)/i.test(eventType)) {
    amountCents = 0;
    status = "canceled";
    normalizedType = "subscription_canceled";
  } else if (/adjustment|refund|chargeback/i.test(eventType)) {
    amountCents = -Math.abs(Number(data.total ?? data.amount ?? 0));
    normalizedType = "refund";
    status = "refunded";
  } else {
    return null;
  }

  const customerId = String(data.customer_id ?? "") || null;
  const subId = String(data.subscription_id ?? "") || null;

  return {
    projectId,
    ownerUserId,
    provider: "paddle",
    externalEventId: eventId,
    externalCustomerId: customerId,
    externalSubscriptionId: subId,
    externalCheckoutId: String(data.id ?? "") || null,
    eventType: normalizedType,
    amountCents,
    currency: String((data.currency_code as string) ?? "USD").toUpperCase(),
    status,
    occurredAt: new Date().toISOString(),
    rawEventId,
  };
}

export function normalizeLemonSqueezyEvent(
  payload: Record<string, unknown>,
  projectId: string,
  ownerUserId: string,
  rawEventId: string | null,
): NormalizedRevenueEvent | null {
  const meta = payload.meta as { event_name?: string; custom_data?: Record<string, unknown> } | undefined;
  const eventName = String(meta?.event_name ?? payload.event_name ?? "");
  const data = (payload.data as { id?: string; attributes?: Record<string, unknown> } | undefined) ?? {};
  const attrs = data.attributes ?? {};
  const eventId = String(meta?.event_name ? `${eventName}_${data.id}` : data.id ?? payload.id ?? "");
  if (!eventId) return null;

  const pid = readCustomProjectId({ custom_data: meta?.custom_data }) ?? projectId;
  let amountCents = 0;
  let status = "succeeded";
  let normalizedType = eventName;

  if (/order_created|subscription_created/i.test(eventName)) {
    amountCents = Number(attrs.total ?? attrs.subtotal ?? 0);
    normalizedType = eventName.includes("subscription") ? "subscription_created" : "payment";
  } else if (/subscription_payment_success/i.test(eventName)) {
    amountCents = Number(attrs.total ?? attrs.subtotal ?? 0);
    normalizedType = "subscription_payment";
  } else if (/subscription_payment_failed/i.test(eventName)) {
    status = "failed";
    normalizedType = "payment_failed";
  } else if (/subscription_cancelled|subscription_expired/i.test(eventName)) {
    normalizedType = "subscription_canceled";
    status = "canceled";
  } else if (/order_refunded/i.test(eventName)) {
    amountCents = -Math.abs(Number(attrs.total ?? attrs.refunded_amount ?? 0));
    normalizedType = "refund";
    status = "refunded";
  } else {
    return null;
  }

  return {
    projectId: pid,
    ownerUserId,
    provider: "lemon_squeezy",
    externalEventId: eventId,
    externalCustomerId: String(attrs.customer_id ?? "") || null,
    externalSubscriptionId: String(attrs.subscription_id ?? "") || null,
    externalCheckoutId: String(attrs.order_id ?? data.id ?? "") || null,
    eventType: normalizedType,
    amountCents,
    currency: String(attrs.currency ?? "USD").toUpperCase(),
    status,
    occurredAt: String(attrs.created_at ?? new Date().toISOString()),
    rawEventId,
  };
}

export function normalizePaypalEvent(
  payload: Record<string, unknown>,
  projectId: string,
  ownerUserId: string,
  rawEventId: string | null,
): NormalizedRevenueEvent | null {
  const eventType = String(payload.event_type ?? "");
  const eventId = String(payload.id ?? "");
  if (!eventId) return null;

  const resource = (payload.resource ?? {}) as Record<string, unknown>;
  let amountCents = 0;
  let status = "succeeded";
  let normalizedType = eventType;

  if (/PAYMENT\.CAPTURE\.COMPLETED|CHECKOUT\.ORDER\.APPROVED/i.test(eventType)) {
    const amount = (resource.amount as { value?: string; currency_code?: string } | undefined) ?? {};
    amountCents = Math.round(Number(amount.value ?? 0) * 100);
    normalizedType = "payment";
  } else if (/PAYMENT\.CAPTURE\.DENIED|FAILED/i.test(eventType)) {
    status = "failed";
    normalizedType = "payment_failed";
  } else if (/BILLING\.SUBSCRIPTION/i.test(eventType)) {
    normalizedType = eventType.includes("CANCEL") ? "subscription_canceled" : "subscription_updated";
    status = eventType.includes("CANCEL") ? "canceled" : String(resource.status ?? "active");
  } else if (/REFUND|CHARGEBACK|REVERSED/i.test(eventType)) {
    const amount = (resource.amount as { value?: string } | undefined) ?? {};
    amountCents = -Math.abs(Math.round(Number(amount.value ?? 0) * 100));
    normalizedType = "refund";
    status = "refunded";
  } else {
    return null;
  }

  return {
    projectId,
    ownerUserId,
    provider: "paypal",
    externalEventId: eventId,
    externalCustomerId:
      String(
        (resource.payer as { email_address?: string } | undefined)?.email_address ??
          (resource.subscriber as { email_address?: string } | undefined)?.email_address ??
          "",
      ) || null,
    externalSubscriptionId: String(resource.id ?? "") || null,
    externalCheckoutId:
      String(
        (
          resource.supplementary_data as
            | { related_ids?: { order_id?: string } }
            | undefined
        )?.related_ids?.order_id ?? "",
      ) || null,
    eventType: normalizedType,
    amountCents,
    currency: String(
      (resource.amount as { currency_code?: string } | undefined)?.currency_code ?? "USD",
    ).toUpperCase(),
    status,
    occurredAt: new Date().toISOString(),
    rawEventId,
  };
}

export async function getProjectOwnerId(projectId: string): Promise<string | null> {
  const { data } = await admin()
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .maybeSingle();
  return (data as { owner_id?: string } | null)?.owner_id ?? null;
}

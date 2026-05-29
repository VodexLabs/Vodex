import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { NormalizedRevenueEvent } from "@/lib/generated-app-payments/revenue-ledger";

function admin() {
  const c = createServiceRoleClient();
  if (!c) throw new Error("Service role unavailable");
  return c;
}

export async function syncCustomerSubscriptionEntitlement(
  event: NormalizedRevenueEvent,
): Promise<void> {
  let customerId: string | null = null;

  if (event.externalCustomerId) {
    const { data: existing } = await admin()
      .from("generated_app_customers" as never)
      .select("id")
      .eq("project_id", event.projectId)
      .eq("provider", event.provider)
      .eq("external_customer_id", event.externalCustomerId)
      .maybeSingle();

    if (existing && (existing as { id: string }).id) {
      customerId = (existing as { id: string }).id;
    } else {
      const { data: inserted } = await admin()
        .from("generated_app_customers" as never)
        .upsert(
          {
            project_id: event.projectId,
            owner_user_id: event.ownerUserId,
            provider: event.provider,
            external_customer_id: event.externalCustomerId,
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: "project_id,provider,external_customer_id" },
        )
        .select("id")
        .single();
      customerId = (inserted as { id?: string } | null)?.id ?? null;
    }
  }

  if (event.externalSubscriptionId) {
    const status = event.eventType.includes("cancel")
      ? "canceled"
      : event.status === "failed"
        ? "past_due"
        : event.eventType.includes("subscription") && event.amountCents === 0
          ? String(event.status)
          : "active";

    await admin()
      .from("generated_app_subscriptions" as never)
      .upsert(
        {
          project_id: event.projectId,
          customer_id: customerId,
          provider: event.provider,
          external_subscription_id: event.externalSubscriptionId,
          status,
          local_entitlement_key: event.localEntitlementKey ?? null,
          canceled_at: status === "canceled" ? new Date().toISOString() : null,
          metadata: { last_event_type: event.eventType, last_amount_cents: event.amountCents },
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "project_id,provider,external_subscription_id" },
      );
  }

  if (event.localEntitlementKey && customerId) {
    const active =
      !event.eventType.includes("cancel") &&
      !event.eventType.includes("refund") &&
      event.status !== "failed";

    await admin()
      .from("generated_app_entitlements" as never)
      .upsert(
        {
          project_id: event.projectId,
          customer_id: customerId,
          entitlement_key: event.localEntitlementKey,
          active,
          source: event.provider,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "project_id,customer_id,entitlement_key" },
      );
  }
}

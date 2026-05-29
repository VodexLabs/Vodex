import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import {
  encryptSecretValue,
  redactConfigSecrets,
} from "@/lib/secrets/payment-secrets";
import type {
  PaymentConnectionMode,
  PaymentConnectionStatus,
  PaymentProviderId,
} from "@/lib/generated-app-payments/types";
import { PROVIDER_SECRET_FIELDS } from "@/lib/generated-app-payments/types";

export type PaymentConnectionRow = {
  id: string;
  provider: PaymentProviderId;
  mode: PaymentConnectionMode;
  status: PaymentConnectionStatus;
  display_name: string | null;
  account_email: string | null;
  external_account_id: string | null;
  public_config: Record<string, unknown>;
  product_mapping: Record<string, unknown>;
  webhook_config: Record<string, unknown>;
  last_verified_at: string | null;
  last_error: string | null;
  updated_at: string;
};

type PaymentConnDbRow = {
  id: string;
  provider: string;
  mode: string;
  status: string;
  display_name: string | null;
  account_email: string | null;
  external_account_id: string | null;
  public_config: unknown;
  product_mapping: unknown;
  webhook_config: unknown;
  last_verified_at: string | null;
  last_error: string | null;
  updated_at: string;
  encrypted_config?: unknown;
};

function mapConnectionRow(r: PaymentConnDbRow): PaymentConnectionRow {
  return {
    id: r.id,
    provider: r.provider as PaymentProviderId,
    mode: r.mode as PaymentConnectionMode,
    status: r.status as PaymentConnectionStatus,
    display_name: r.display_name,
    account_email: r.account_email,
    external_account_id: r.external_account_id,
    public_config: (r.public_config ?? {}) as Record<string, unknown>,
    product_mapping: (r.product_mapping ?? {}) as Record<string, unknown>,
    webhook_config: (r.webhook_config ?? {}) as Record<string, unknown>,
    last_verified_at: r.last_verified_at,
    last_error: r.last_error,
    updated_at: r.updated_at,
  };
}

function admin() {
  const c = createServiceRoleClient();
  if (!c) throw new Error("Service role unavailable");
  return c;
}

export async function assertProjectOwner(
  projectId: string,
  userId: string,
  userClient?: SupabaseClient<Database>,
): Promise<boolean> {
  try {
    if (userClient) {
      const { data } = await userClient
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("owner_id", userId)
        .maybeSingle();
      return Boolean(data?.id);
    }
    const { data } = await admin()
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("owner_id", userId)
      .maybeSingle();
    return Boolean(data?.id);
  } catch {
    return false;
  }
}

export async function listPaymentConnections(
  projectId: string,
): Promise<PaymentConnectionRow[]> {
  const { data, error } = await admin()
    .from("payment_provider_connections" as never)
    .select(
      "id, provider, mode, status, display_name, account_email, external_account_id, public_config, product_mapping, webhook_config, last_verified_at, last_error, updated_at",
    )
    .eq("project_id", projectId);
  if (error) {
    if (/does not exist|schema cache|relation/i.test(error.message)) return [];
    console.warn("[payments] list connections:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as PaymentConnDbRow[]).map(mapConnectionRow);
}

export async function savePaymentConnection(input: {
  projectId: string;
  ownerUserId: string;
  provider: PaymentProviderId;
  mode: PaymentConnectionMode;
  displayName?: string;
  accountEmail?: string;
  externalAccountId?: string;
  secrets?: Record<string, string>;
  publicConfig?: Record<string, unknown>;
  productMapping?: Record<string, unknown>;
  webhookConfig?: Record<string, unknown>;
}): Promise<PaymentConnectionRow> {
  const encrypted: Record<string, string> = {};
  if (input.secrets) {
    for (const [k, v] of Object.entries(input.secrets)) {
      if (v?.trim()) encrypted[k] = encryptSecretValue(v.trim());
    }
  }

  const { data: existing } = await admin()
    .from("payment_provider_connections" as never)
    .select("encrypted_config")
    .eq("project_id", input.projectId)
    .eq("provider", input.provider)
    .maybeSingle();

  const existingRow = existing as unknown as PaymentConnDbRow | null;
  const prevEnc =
    existingRow?.encrypted_config && typeof existingRow.encrypted_config === "object"
      ? (existingRow.encrypted_config as Record<string, string>)
      : {};

  const row = {
    owner_user_id: input.ownerUserId,
    project_id: input.projectId,
    provider: input.provider,
    mode: input.mode,
    status: Object.keys({ ...prevEnc, ...encrypted }).length ? "connected" : "missing_config",
    display_name: input.displayName ?? PROVIDER_SECRET_FIELDS[input.provider][0] ?? input.provider,
    account_email: input.accountEmail ?? null,
    external_account_id: input.externalAccountId ?? null,
    encrypted_config: { ...prevEnc, ...encrypted },
    public_config: input.publicConfig ?? {},
    product_mapping: input.productMapping ?? {},
    webhook_config: input.webhookConfig ?? {},
    last_error: null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin()
    .from("payment_provider_connections" as never)
    .upsert(row as never, { onConflict: "project_id,provider" })
    .select(
      "id, provider, mode, status, display_name, account_email, external_account_id, public_config, product_mapping, webhook_config, last_verified_at, last_error, updated_at",
    )
    .single();

  if (error) throw new Error(error.message);
  return mapConnectionRow(data as unknown as PaymentConnDbRow);
}

export function toPublicConnection(row: PaymentConnectionRow, productCount: number) {
  return {
    provider: row.provider,
    status: row.status,
    mode: row.mode,
    display_name: row.display_name,
    account_email: row.account_email,
    external_account_id: row.external_account_id,
    public_config: row.public_config,
    product_count: productCount,
    last_verified_at: row.last_verified_at,
    last_error: row.last_error ? row.last_error.slice(0, 200) : null,
  };
}

export async function writePaymentAudit(input: {
  projectId: string;
  userId: string;
  provider: string;
  action: string;
  status: string;
  metadata?: Record<string, unknown>;
}) {
  await admin().from("payment_connector_audit_logs" as never).insert({
    project_id: input.projectId,
    user_id: input.userId,
    provider: input.provider,
    action: input.action,
    status: input.status,
    metadata: input.metadata ?? {},
  } as never);
}

export async function countPaymentProducts(projectId: string, provider?: string): Promise<number> {
  let q = admin()
    .from("project_payment_products" as never)
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("active", true);
  if (provider) q = q.eq("provider", provider);
  const { count, error } = await q;
  if (error) return 0;
  return count ?? 0;
}

export async function getDecryptedSecrets(
  projectId: string,
  provider: PaymentProviderId,
): Promise<Record<string, string>> {
  const { decryptSecretValue } = await import("@/lib/secrets/payment-secrets");
  const { data } = await admin()
    .from("payment_provider_connections" as never)
    .select("encrypted_config")
    .eq("project_id", projectId)
    .eq("provider", provider)
    .maybeSingle();
  const enc = ((data as unknown as PaymentConnDbRow | null)?.encrypted_config ?? {}) as Record<
    string,
    string
  >;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(enc)) {
    try {
      out[k] = decryptSecretValue(v);
    } catch {
      /* skip bad seal */
    }
  }
  return out;
}

export function redactConnectionForAdmin(encrypted: Record<string, unknown>): Record<string, unknown> {
  const keys = Object.keys(encrypted);
  return redactConfigSecrets(encrypted as Record<string, unknown>, keys);
}

export async function disablePaymentConnection(
  projectId: string,
  provider: PaymentProviderId,
): Promise<void> {
  const { error } = await admin()
    .from("payment_provider_connections" as never)
    .update({ status: "disabled", updated_at: new Date().toISOString() } as never)
    .eq("project_id", projectId)
    .eq("provider", provider);
  if (error) throw new Error(error.message);
}

export async function deletePaymentConnection(
  projectId: string,
  provider: PaymentProviderId,
): Promise<void> {
  const { error } = await admin()
    .from("payment_provider_connections" as never)
    .delete()
    .eq("project_id", projectId)
    .eq("provider", provider);
  if (error) throw new Error(error.message);
}

export async function listPaymentProducts(projectId: string, provider?: string) {
  let q = admin()
    .from("project_payment_products" as never)
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (provider) q = q.eq("provider", provider);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertPaymentProduct(input: {
  projectId: string;
  provider: string;
  productType: string;
  name: string;
  description?: string;
  externalProductId?: string;
  externalPriceId?: string;
  localEntitlementKey?: string;
  amountCents?: number;
  currency?: string;
  interval?: string | null;
  productId?: string;
}) {
  const row = {
    project_id: input.projectId,
    provider: input.provider,
    product_type: input.productType,
    name: input.name,
    description: input.description ?? null,
    external_product_id: input.externalProductId ?? null,
    external_price_id: input.externalPriceId ?? null,
    local_entitlement_key: input.localEntitlementKey ?? null,
    amount_cents: input.amountCents ?? null,
    currency: input.currency ?? "USD",
    interval: input.interval ?? null,
    updated_at: new Date().toISOString(),
  };
  if (input.productId) {
    const { data, error } = await admin()
      .from("project_payment_products" as never)
      .update(row as never)
      .eq("id", input.productId)
      .eq("project_id", input.projectId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await admin()
    .from("project_payment_products" as never)
    .insert(row as never)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deletePaymentProduct(projectId: string, productId: string) {
  const { error } = await admin()
    .from("project_payment_products" as never)
    .delete()
    .eq("project_id", projectId)
    .eq("id", productId);
  if (error) throw new Error(error.message);
}

export async function storeWebhookEvent(input: {
  projectId: string | null;
  provider: string;
  eventId: string | null;
  eventType: string | null;
  payload: Record<string, unknown>;
}) {
  const { error } = await admin().from("payment_webhook_events" as never).insert({
    project_id: input.projectId,
    provider: input.provider,
    event_id: input.eventId,
    event_type: input.eventType,
    payload: input.payload,
  } as never);
  if (error && !error.message.includes("duplicate")) {
    throw new Error(error.message);
  }
}

import { createServiceRoleClient } from "@/lib/supabase/admin";

const REQUIRED_TABLES = [
  "payment_provider_connections",
  "payment_webhook_events",
  "project_payment_products",
  "generated_app_revenue_events",
  "generated_app_subscriptions",
  "generated_app_entitlements",
  "payment_connector_audit_logs",
] as const;

export type PaymentMigrationsHealth = {
  ok: boolean;
  missingTables: string[];
  migrationHint: string;
};

const MIGRATION_HINT =
  "Apply migrations: supabase/migrations/20260701120000_payment_connectors.sql and supabase/migrations/20260702120000_payment_revenue_ledger.sql";

export async function checkPaymentMigrationsHealth(): Promise<PaymentMigrationsHealth> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return { ok: false, missingTables: [...REQUIRED_TABLES], migrationHint: MIGRATION_HINT };
  }

  const missing: string[] = [];
  for (const table of REQUIRED_TABLES) {
    const { error } = await admin.from(table as never).select("id", { head: true, count: "exact" }).limit(1);
    if (error && /does not exist|schema cache|relation/i.test(error.message)) {
      missing.push(table);
    }
  }

  return {
    ok: missing.length === 0,
    missingTables: missing,
    migrationHint: MIGRATION_HINT,
  };
}

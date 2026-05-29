import { createClient } from "@/lib/supabase/server";
import { loadProfileBillingRow } from "@/lib/supabase/load-profile-billing";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import {
  WEB_PAYMENT_PROVIDERS,
  PROVIDER_LABELS,
  PROVIDER_TAGLINES,
  type PaymentProviderId,
} from "@/lib/generated-app-payments/types";
import {
  assertProjectOwner,
  countPaymentProducts,
  listPaymentConnections,
  toPublicConnection,
} from "@/lib/generated-app-payments/connection-store";
import { canConnectAppPayments } from "@/lib/generated-app-payments/plan-gate";
import { getAppUrl } from "@/lib/app-url";
import { checkPaymentMigrationsHealth } from "@/lib/generated-app-payments/payment-migrations-health";

export const dynamic = "force-dynamic";

const ALL_PROVIDERS: PaymentProviderId[] = [...WEB_PAYMENT_PROVIDERS, "revenuecat"];

const MIGRATION_HINT =
  "Apply migrations: supabase/migrations/20260701120000_payment_connectors.sql and 20260702120000_payment_revenue_ledger.sql";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("unauthorized", "Unauthorized", 401);
    if (!(await assertProjectOwner(projectId, user.id, supabase))) {
      return jsonError("not_found", "Not found", 404);
    }

    const { row: billing } = await loadProfileBillingRow(supabase, user);
    const canConnect = canConnectAppPayments(billing?.plan_id);
    const base = getAppUrl();
    const migrationHealth = await checkPaymentMigrationsHealth();

    const rows = await listPaymentConnections(projectId);
    const byProvider = new Map(rows.map((r) => [r.provider, r]));

    const cards = await Promise.all(
      ALL_PROVIDERS.map(async (provider) => {
        const row = byProvider.get(provider);
        const productCount = row ? await countPaymentProducts(projectId, provider) : 0;
        const pub = row
          ? toPublicConnection(row, productCount)
          : {
              status: "not_connected" as const,
              mode: "test" as const,
              display_name: null,
              account_email: null,
              external_account_id: null,
              public_config: {},
              product_count: 0,
              last_verified_at: null,
              last_error: null,
            };
        return {
          ...pub,
          provider,
          label: PROVIDER_LABELS[provider],
          tagline: PROVIDER_TAGLINES[provider],
          is_mobile: provider === "revenuecat",
          can_connect: canConnect,
          webhook_url: provider !== "revenuecat" ? `${base}/api/webhooks/payments/${provider === "lemon_squeezy" ? "lemon-squeezy" : provider}` : null,
        };
      }),
    );

    return jsonOk({
      providers: cards,
      migrations_ok: migrationHealth.ok,
      setup_warning: migrationHealth.ok ? undefined : migrationHealth.migrationHint,
      responsibility_notice:
        "Your app uses the payment provider you connect. You are responsible for your provider account, fees, approvals, refunds, disputes, taxes, chargebacks, store compliance, and customer billing obligations.",
    });
  } catch (err) {
    console.error("[payments/providers] GET failed:", err);
    return jsonOk({
      providers: ALL_PROVIDERS.map((provider) => ({
        provider,
        label: PROVIDER_LABELS[provider],
        tagline: PROVIDER_TAGLINES[provider],
        is_mobile: provider === "revenuecat",
        can_connect: false,
        status: "not_connected",
        mode: "test",
        display_name: null,
        account_email: null,
        external_account_id: null,
        public_config: {},
        product_count: 0,
        last_verified_at: null,
        last_error: null,
        webhook_url: null,
      })),
      responsibility_notice:
        "Your app uses the payment provider you connect. You are responsible for fees, compliance, and customer billing.",
      setup_warning: MIGRATION_HINT,
      warning: err instanceof Error ? err.message : "payments_unavailable",
    });
  }
}

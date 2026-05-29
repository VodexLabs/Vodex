import { createServiceRoleClient } from "@/lib/supabase/admin";
import { listPaymentConnections } from "@/lib/generated-app-payments/connection-store";

export type MobileRevenueCatPublicConfig = {
  enabled: boolean;
  publicSdkKey: string | null;
  entitlementId: string | null;
  offeringId: string | null;
  platform: string | null;
  packageName: string | null;
  bundleId: string | null;
};

/** Public-only billing config for injected mobile wrapper builds — no secrets. */
export async function loadMobileRevenueCatPublicConfig(
  projectId: string,
): Promise<MobileRevenueCatPublicConfig> {
  const empty: MobileRevenueCatPublicConfig = {
    enabled: false,
    publicSdkKey: null,
    entitlementId: null,
    offeringId: null,
    platform: null,
    packageName: null,
    bundleId: null,
  };

  const admin = createServiceRoleClient();
  if (!admin) return empty;

  const { data: mobile } = await admin
    .from("mobile_billing_configs" as never)
    .select(
      "platform, package_name, bundle_id, revenuecat_entitlement_id, revenuecat_offering_id, setup_status",
    )
    .eq("project_id", projectId)
    .maybeSingle();

  const rows = await listPaymentConnections(projectId);
  const rc = rows.find((r) => r.provider === "revenuecat");
  const pub = (rc?.public_config ?? {}) as Record<string, unknown>;

  const publicSdkKey =
    typeof pub.public_sdk_key === "string" && pub.public_sdk_key.trim()
      ? pub.public_sdk_key.trim()
      : null;

  const m = mobile as {
    platform?: string;
    package_name?: string;
    bundle_id?: string;
    revenuecat_entitlement_id?: string;
    revenuecat_offering_id?: string;
    setup_status?: string;
  } | null;

  const enabled = Boolean(
    publicSdkKey &&
      m?.revenuecat_entitlement_id &&
      m.setup_status !== "not_started",
  );

  return {
    enabled,
    publicSdkKey,
    entitlementId: m?.revenuecat_entitlement_id ?? null,
    offeringId: m?.revenuecat_offering_id ?? null,
    platform: m?.platform ?? null,
    packageName: m?.package_name ?? null,
    bundleId: m?.bundle_id ?? null,
  };
}

export function buildDreamosBillingJson(config: MobileRevenueCatPublicConfig): string {
  return JSON.stringify(
    {
      revenuecat: {
        enabled: config.enabled,
        public_sdk_key: config.publicSdkKey,
        entitlement_id: config.entitlementId,
        offering_id: config.offeringId,
      },
      platform: config.platform,
      package_name: config.packageName,
      bundle_id: config.bundleId,
    },
    null,
    2,
  );
}

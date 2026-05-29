import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { jsonError, jsonOk } from "@/lib/api/json-response";
import { assertProjectOwner } from "@/lib/generated-app-payments/connection-store";
import { canConnectAppPayments, paymentsGateMessage } from "@/lib/generated-app-payments/plan-gate";
import { loadProfileBillingRow } from "@/lib/supabase/load-profile-billing";
import { savePaymentConnection } from "@/lib/generated-app-payments/connection-store";
import { verifyRevenueCatConfig } from "@/lib/mobile-billing/revenuecat";

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

    const admin = createServiceRoleClient();
    if (!admin) return jsonOk({ config: null });

    const { data } = await admin
      .from("mobile_billing_configs" as never)
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    return jsonOk({ config: data ?? null });
  } catch (err) {
    return jsonError("internal_error", err instanceof Error ? err.message : "Failed", 500);
  }
}

export async function PATCH(
  req: Request,
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
    if (!canConnectAppPayments(billing?.plan_id)) {
      return jsonError("plan_required", paymentsGateMessage(), 402);
    }

    const body = await req.json();
    const admin = createServiceRoleClient();
    if (!admin) return jsonError("service_unavailable", "Service unavailable", 503);

    const hasSecret =
      typeof body.secretApiKey === "string" && body.secretApiKey.trim().length > 0;
    const hasPublic =
      typeof body.publicSdkKey === "string" && body.publicSdkKey.trim().length > 0;
    if (hasSecret || hasPublic) {
      await savePaymentConnection({
        projectId,
        ownerUserId: user.id,
        provider: "revenuecat",
        mode: "sandbox",
        secrets: hasSecret ? { secret_api_key: body.secretApiKey.trim() } : undefined,
        publicConfig: {
          ...(hasPublic ? { public_sdk_key: body.publicSdkKey.trim() } : {}),
          entitlement_id: body.entitlementId ?? undefined,
          offering_id: body.offeringId ?? undefined,
        },
      });
    }

    const row = {
      project_id: projectId,
      platform: body.platform ?? "both",
      provider: "revenuecat",
      package_name: body.packageName ?? null,
      bundle_id: body.bundleId ?? null,
      revenuecat_entitlement_id: body.entitlementId ?? null,
      revenuecat_offering_id: body.offeringId ?? null,
      revenuecat_project_id:
        typeof body.revenueCatProjectId === "string" ? body.revenueCatProjectId.trim() : null,
      product_ids: body.productIds ?? [],
      checklist: body.checklist ?? {},
      setup_status: body.setupStatus ?? "needs_store_setup",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from("mobile_billing_configs" as never)
      .upsert(row as never, { onConflict: "project_id" })
      .select("*")
      .single();

    if (error) return jsonError("save_failed", error.message, 500);

    return jsonOk({ config: data });
  } catch (err) {
    return jsonError("internal_error", err instanceof Error ? err.message : "Failed", 500);
  }
}

export async function POST(
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

    const body = await _req.json();
    const result = await verifyRevenueCatConfig({
      secret_api_key: body.secretApiKey,
      public_sdk_key: body.publicSdkKey,
    });

    if (!result.ok) return jsonError("verify_failed", result.message, 400);
    return jsonOk({ message: result.message });
  } catch (err) {
    return jsonError("internal_error", err instanceof Error ? err.message : "Failed", 500);
  }
}

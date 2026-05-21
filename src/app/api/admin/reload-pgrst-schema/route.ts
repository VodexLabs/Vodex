import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { runChargeTokensDebugReport } from "@/lib/db/probe-charge-tokens-rpc";
import { bustAdminSchemaHealthCache } from "@/lib/cache/admin-schema-health-cache";
import { invalidateChargeTokensProbeCache } from "@/lib/db/charge-probe-cache";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const gate = await requireDreamosOwner();
    if (gate.error) return gate.error;

    const admin = createServiceRoleClient();
    if (!admin) {
      return NextResponse.json(
        {
          ok: false,
          diagnosis: "SUPABASE_SERVICE_ROLE_KEY is not configured.",
          nextAction: "Add the service role key to server env and restart.",
        },
        { status: 503 },
      );
    }

    let reloadMethod: "dreamos_reload_pgrst_schema" | "unavailable" = "unavailable";
    let reloadError: string | null = null;
    let reloadResult: unknown = null;

    const { data, error: reloadErr } = await admin.rpc("dreamos_reload_pgrst_schema" as never);
    if (!reloadErr) {
      reloadMethod = "dreamos_reload_pgrst_schema";
      reloadResult = data;
    } else {
      reloadError = reloadErr.message;
    }

    await new Promise((r) => setTimeout(r, 2000));
    bustAdminSchemaHealthCache();
    invalidateChargeTokensProbeCache();
    const report = await runChargeTokensDebugReport(gate.user.id);

    return NextResponse.json({
      ok: report.ok,
      reloadMethod,
      reloadError,
      reloadResult,
      diagnosis: report.diagnosis,
      nextAction: report.nextAction,
      userMessage: report.userMessage,
      issue: report.issue,
      postgrestCallable: report.postgrestCallable,
      serviceRoleExecutable: report.serviceRoleExecutable,
      postgresExists: report.postgresExists,
      tables: report.tables,
      pgCatalog: {
        charge_tokens_exists: report.postgresExists,
        charge_tokens_canonical: report.postgresCanonical,
      },
      hint:
        reloadMethod === "unavailable"
          ? "dreamos_reload_pgrst_schema is not callable yet — run Copy SQL fix first (includes NOTIFY pgrst at the end)."
          : report.ok
            ? null
            : report.nextAction,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "reload_failed";
    return NextResponse.json({ ok: false, diagnosis: msg, nextAction: "Retry Reload schema after running Copy SQL fix." }, { status: 500 });
  }
}

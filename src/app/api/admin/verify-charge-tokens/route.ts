import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { bustAdminSchemaHealthCache } from "@/lib/cache/admin-schema-health-cache";
import { invalidateChargeTokensProbeCache } from "@/lib/db/charge-probe-cache";
import { runChargeTokensDebugReport } from "@/lib/db/probe-charge-tokens-rpc";

export const dynamic = "force-dynamic";

export async function POST() {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  bustAdminSchemaHealthCache();
  invalidateChargeTokensProbeCache();
  const report = await runChargeTokensDebugReport();

  return NextResponse.json({
    ok: report.ok,
    issue: report.issue,
    userMessage: report.userMessage,
    actionHint: report.actionHint,
    postgresExists: report.postgresExists,
    postgrestCallable: report.postgrestCallable,
    serviceRoleExecutable: report.serviceRoleExecutable,
    postgrestError: report.postgrestError,
    serviceRoleError: report.serviceRoleError,
    catalogProbeError: report.catalogProbeError,
    lastError: report.lastError,
    checked_at: report.checkedAt,
    postgrest_reload_hint: "NOTIFY pgrst, 'reload schema';",
  });
}

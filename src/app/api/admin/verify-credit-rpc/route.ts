import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { bustAdminRuntimeHealthCache, getCachedAdminRuntimeHealth } from "@/lib/cache/admin-runtime-health-cache";
import { getAdminRuntimeHealth } from "@/lib/db/admin-runtime-health";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export async function GET(req: Request) {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  const force = new URL(req.url).searchParams.get("refresh") === "1";
  if (force) bustAdminRuntimeHealthCache();

  const health = await getCachedAdminRuntimeHealth(getAdminRuntimeHealth, force);
  const ct = health.rpcs.charge_tokens;

  return NextResponse.json(
    {
      ok: health.ok && ct.callableByPostgrest && ct.executableByServiceRole,
      checkedAt: health.checkedAt,
      source: health.source,
      projectRef: health.projectRef,
      helperRpcUnavailable: health.helperRpcUnavailable,
      tables: health.tables,
      charge_tokens: ct,
      missing: health.missing,
      warnings: health.warnings,
      contradictions: health.contradictions,
    },
    { headers: NO_STORE },
  );
}

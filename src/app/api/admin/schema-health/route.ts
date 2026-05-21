import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { getAdminRuntimeHealth } from "@/lib/db/admin-runtime-health";
import {
  bustAdminRuntimeHealthCache,
  getCachedAdminRuntimeHealth,
} from "@/lib/cache/admin-runtime-health-cache";

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

  try {
    const report = await getCachedAdminRuntimeHealth(getAdminRuntimeHealth, force);
    return NextResponse.json(report, {
      status: report.ok ? 200 : 503,
      headers: NO_STORE,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "schema_health_failed";
    return NextResponse.json(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        source: "fresh" as const,
        projectRef: null,
        missing: [],
        warnings: [],
        rawErrors: [msg],
        contradictions: [],
        error: msg,
      },
      { status: 503, headers: NO_STORE },
    );
  }
}

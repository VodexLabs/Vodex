import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { SMOKE_REPORT_FILENAME, type ModelSmokeReport } from "@/lib/ai/model-smoke-test";

export const dynamic = "force-dynamic";

/** GET /api/admin/model-smoke-report — owner-only read of last smoke test JSON */
export async function GET() {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  const reportPath = path.join(process.cwd(), SMOKE_REPORT_FILENAME);
  if (!fs.existsSync(reportPath)) {
    return NextResponse.json(
      { ok: false, error: "No smoke report yet. Run npm run smoke:models-small on the server." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const raw = fs.readFileSync(reportPath, "utf8");
    const report = JSON.parse(raw) as ModelSmokeReport;
    return NextResponse.json(
      {
        ok: true,
        report,
        routingNotes: report.routingNotes,
        note: "Admin-only — not exposed to normal users.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to read report" },
      { status: 500 },
    );
  }
}

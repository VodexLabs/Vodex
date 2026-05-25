import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import {
  anthropicEnvDisableInstruction,
  buildCatalogAvailabilityReport,
  summarizeProviderSelectable,
} from "@/lib/ai/model-catalog-availability";
import { SMOKE_REPORT_FILENAME, type CombinedModelSmokeReport, type SmokeModelRow } from "@/lib/ai/model-smoke-test";
import { previewAllRoutingModes, ROUTING_SMOKE_DISCLAIMER } from "@/lib/ai/routing-smoke-preview";
import { listProviderHealthSummary } from "@/lib/ai/provider-availability";
import {
  fetchRecentModelDecisionLogsFromDb,
  getRecentInternalModelDecisions,
} from "@/lib/ai/model-decision-log";
import { loadSmokeRoutingNotes } from "@/lib/ai/smoke-routing-loader";

export const dynamic = "force-dynamic";

/** GET /api/admin/model-catalog-health — owner-only model availability + routing preview */
export async function GET() {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  let smokeRows: SmokeModelRow[] = [];
  let routingNotes = loadSmokeRoutingNotes();
  const reportPath = path.join(process.cwd(), SMOKE_REPORT_FILENAME);
  if (fs.existsSync(reportPath)) {
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as CombinedModelSmokeReport & {
        rows?: SmokeModelRow[];
      };
      smokeRows =
        report.productAwareSmoke?.rows ??
        report.rawProviderSmoke?.rows ??
        report.rows ??
        [];
      routingNotes = report.routingNotes ?? routingNotes;
    } catch {
      smokeRows = [];
    }
  }

  const models = buildCatalogAvailabilityReport(smokeRows);
  const routingPreview = previewAllRoutingModes();
  const recentModelDecisions = await fetchRecentModelDecisionLogsFromDb(30);

  return NextResponse.json(
    {
      checkedAt: new Date().toISOString(),
      providers: listProviderHealthSummary(),
      providerSelectable: summarizeProviderSelectable(),
      anthropicEnableHint: anthropicEnvDisableInstruction(),
      models,
      routingPreview,
      routingNotes,
      recentModelDecisions,
      inMemoryModelDecisions: getRecentInternalModelDecisions(10),
      routingDisclaimer: ROUTING_SMOKE_DISCLAIMER,
      smokeReportPresent: smokeRows.length > 0,
      note: "Admin-only — provider costs and routing internals are not exposed to normal users.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import {
  compareCostRouting,
  costRoutingReportMatrix,
} from "@/lib/ai/cost-routing-report";

export const dynamic = "force-dynamic";

/** GET /api/admin/cost-routing-report — verified legacy vs optimized provider USD estimates */
export async function GET(request: Request) {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  const url = new URL(request.url);
  const complexity = Math.min(10, Math.max(1, Number(url.searchParams.get("complexity") ?? "6") || 6));

  const single = compareCostRouting(complexity);
  const matrix = costRoutingReportMatrix();

  return NextResponse.json({
    ok: true,
    methodology:
      "Estimates use estimateTokenProviderCostUsd() with typical per-stage token counts. Legacy = pre-optimization Sonnet-heavy routing; optimized = current model-router.",
    atComplexity: single,
    matrix,
    targetSavingsPercent: 90,
    meetsTarget: single.savingsPercent >= 85,
  });
}

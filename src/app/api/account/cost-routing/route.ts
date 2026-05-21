import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { compareCostRouting, costRoutingReportMatrix } from "@/lib/ai/cost-routing-report";

export const dynamic = "force-dynamic";

/** Verified legacy vs optimized provider USD (same math as admin report). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const single = compareCostRouting(6);
  const matrix = costRoutingReportMatrix();

  return NextResponse.json({
    ok: true,
    methodology:
      "USD estimates from estimateTokenProviderCostUsd() with typical per-stage token counts. Legacy = Sonnet/Opus on every stage; optimized = cheap plan/chat + tiered implementation.",
    atComplexity: single,
    matrix,
    targetSavingsPercent: 90,
    meetsTarget: single.savingsPercent >= 85,
  });
}

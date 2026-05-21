import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { getCreditBillingSqlPatch } from "@/lib/db/credit-billing-sql-patch";

export async function GET() {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  try {
    return NextResponse.json(
      { sql: getCreditBillingSqlPatch() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "sql_patch_unavailable";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

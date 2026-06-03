import { NextResponse } from "next/server";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { searchMarketingRecipients } from "@/lib/admin/search-marketing-recipients";

export async function GET(req: Request) {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const { results, error } = await searchMarketingRecipients(q, 10);
  if (error) {
    return NextResponse.json({ error, results: [] }, { status: 500 });
  }
  return NextResponse.json({ results });
}

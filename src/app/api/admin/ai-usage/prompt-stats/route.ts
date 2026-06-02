import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { requireDreamosOwner } from "@/lib/admin/require-owner";
import { fetchAiUsagePromptStats } from "@/lib/admin/admin-query-compat";

export async function GET() {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server misconfigured";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  const sinceIso = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { stats, error } = await fetchAiUsagePromptStats(admin, sinceIso);

  if (error) {
    return NextResponse.json({ error, stats: { total: 0, success: 0, failed: 0 } }, { status: 200 });
  }

  return NextResponse.json({ stats, sinceIso });
}

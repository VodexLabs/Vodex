import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { requireDreamosOwner } from "@/lib/admin/require-owner";

export async function GET(req: Request) {
  const gate = await requireDreamosOwner();
  if (gate.error) return gate.error;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 500);

  const admin = createSupabaseAdmin();
  let query = admin
    .from("runtime_action_usage_logs" as never)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (projectId) query = query.eq("project_id" as never, projectId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message, logs: [] }, { status: 200 });

  return NextResponse.json({ logs: data ?? [] });
}

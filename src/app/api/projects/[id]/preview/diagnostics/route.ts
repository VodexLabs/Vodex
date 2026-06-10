import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildPreviewDiagnosticsReport } from "@/lib/preview/build-preview-diagnostics-report";

export const dynamic = "force-dynamic";

/** Complete preview diagnostic report for production validation. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: owned } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const report = await buildPreviewDiagnosticsReport(supabase, projectId);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(report, {
    headers: { "Cache-Control": "no-store" },
  });
}

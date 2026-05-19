import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { scanAppSourceForReadiness } from "@/lib/publish/readiness-scan";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("id, owner_id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createServiceRoleClient() ?? supabase;
  const { data: files, error } = await admin
    .from("app_files")
    .select("path, content")
    .eq("project_id", projectId)
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const issues = scanAppSourceForReadiness(
    (files ?? []).map((f) => ({ path: f.path, content: f.content ?? "" })),
  );

  return NextResponse.json({
    fileCount: files?.length ?? 0,
    issues,
    scannedAt: new Date().toISOString(),
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getProjectAccess } from "@/lib/projects/project-access";
import { restoreAppVersion } from "@/lib/projects/app-version-history";
import { buildProjectVersionTimeline } from "@/lib/projects/project-version-timeline";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getProjectAccess(supabase, user.id, projectId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const timeline = await buildProjectVersionTimeline(admin, projectId, user.id);
  return NextResponse.json({
    versions: timeline.versions,
    timeline: timeline.entries,
    prompts: timeline.prompts,
    published_versions: timeline.published_versions,
    current_preview_version_id: timeline.current_preview_version_id,
    live_published_version: timeline.live_published_version,
    project_published_at: timeline.project_published_at,
  });
}

export async function POST(req: Request, ctx: RouteCtx) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getProjectAccess(supabase, user.id, projectId);
  if (!access?.canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as { action?: string; versionId?: string };
  if (body.action !== "restore" || !body.versionId) {
    return NextResponse.json({ error: "action=restore and versionId required" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const { data: project } = await admin
    .from("projects")
    .select("owner_id, workspace_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const result = await restoreAppVersion({
    admin,
    projectId,
    ownerId: project.owner_id,
    workspaceId: project.workspace_id,
    versionId: body.versionId,
    restoredBy: user.id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "restore_failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, newVersionNumber: result.newVersionNumber });
}

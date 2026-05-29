import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectPreviewHtml } from "@/lib/preview/project-preview-html";

export const dynamic = "force-dynamic";

/** Deterministic in-app preview HTML from persisted project files. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: proj } = await supabase
    .from("projects")
    .select("id, metadata")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!proj) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const meta =
    proj.metadata && typeof proj.metadata === "object" && !Array.isArray(proj.metadata)
      ? (proj.metadata as Record<string, unknown>)
      : {};

  const { html, fileCount, archetypeId } = await resolveProjectPreviewHtml(
    supabase,
    projectId,
    meta,
  );

  return NextResponse.json({
    html,
    fileCount,
    archetypeId,
    ready: html.includes("generated-app-preview-root"),
  });
}

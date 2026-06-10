import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { requireMutationProjectId, isNextResponse } from "@/lib/ids/api-mutation-guard";
import { requireOwnedProject, isOwnedProjectFailure } from "@/lib/security/owned-project";
import { repairPreviewInnerRoute } from "@/lib/preview/preview-inner-route-repair";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const projectId = requireMutationProjectId(rawId);
  if (isNextResponse(projectId)) return projectId;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Service role unavailable" }, { status: 503 });
  }

  const owned = await requireOwnedProject(supabase, projectId, user.id);
  if (isOwnedProjectFailure(owned)) return owned;

  const { data: proj } = await supabase
    .from("projects")
    .select("id, metadata")
    .eq("id", projectId)
    .maybeSingle();

  const meta =
    proj?.metadata && typeof proj.metadata === "object" && !Array.isArray(proj.metadata)
      ? (proj.metadata as Record<string, unknown>)
      : {};

  const artifactPath =
    typeof meta.preview_artifact_path === "string" ? meta.preview_artifact_path.trim() : "";
  if (!artifactPath) {
    return NextResponse.json(
      { ok: false, error: "No preview artifact path — run preview build first" },
      { status: 400 },
    );
  }

  const result = await repairPreviewInnerRoute({
    admin,
    writer: supabase,
    userId: user.id,
    projectId,
    artifactPath,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    sanitizedFiles: result.sanitizedFiles,
    jobId: result.jobId,
    queued: result.queued,
    message: result.message,
  });
}

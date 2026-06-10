import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { mergePreviewIframeEmbedHeaders } from "@/lib/preview/preview-iframe-embed-headers";
import { loadSanitizedPreviewArtifactAsset } from "@/lib/preview/serve-preview-artifact-asset";

export const dynamic = "force-dynamic";

/** Canonical preview-runtime asset serving — sanitized text bundles, no stale preview-html routes. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ projectId: string; artifactId: string; path: string[] }> },
) {
  const { projectId, artifactId, path: pathParts } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: proj } = await supabase
    .from("projects")
    .select("id, metadata")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!proj) return new NextResponse("Not found", { status: 404 });

  const meta =
    proj.metadata && typeof proj.metadata === "object" && !Array.isArray(proj.metadata)
      ? (proj.metadata as Record<string, unknown>)
      : {};

  const artifactPath =
    (typeof meta.preview_artifact_path === "string" && meta.preview_artifact_path) ||
    `${projectId}/${artifactId}`;

  const admin = createSupabaseAdmin();
  if (!admin) return new NextResponse("Service unavailable", { status: 503 });

  const rel = pathParts?.length ? pathParts.join("/") : "index.html";

  const file = await loadSanitizedPreviewArtifactAsset({
    admin,
    artifactPath,
    relativePath: rel,
    projectId,
    virtualRoute: "/",
  });
  if (!file) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(file.data), {
    status: 200,
    headers: mergePreviewIframeEmbedHeaders({
      "Content-Type": file.contentType,
      "Cache-Control": "private, no-store",
      "X-Preview-Asset-Leaks": String(file.leakCount),
    }),
  });
}

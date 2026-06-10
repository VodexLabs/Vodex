import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { downloadPreviewArtifactFile } from "@/lib/imports/preview-artifact-writer";
import { injectPreviewShims, analyzeLegacyAdapter } from "@/lib/imports/base44-lovable-adapter";
import { detectImportedFramework } from "@/lib/imports/framework-detector";
import { rewritePreviewArtifactHtml } from "@/lib/preview/rewrite-preview-artifact-html";
import { assertPreviewBootstrapClean } from "@/lib/preview/preview-bootstrap-sanitizer";
import { buildPreviewBootstrapLeakPanel } from "@/lib/preview/preview-bootstrap-leak-panel";

export const dynamic = "force-dynamic";

const CACHE_HEADERS = { "Cache-Control": "no-store, max-age=0" } as const;

/** Virtual preview path — browser URL is app route, not /api/projects/.../preview-html. */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ projectId: string; artifactId: string; path?: string[] }> },
) {
  const { projectId, artifactId, path: pathSegments } = await ctx.params;
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

  const virtualRoute =
    pathSegments?.length ? `/${pathSegments.map(decodeURIComponent).join("/")}` : "/";

  const admin = createSupabaseAdmin();
  const file = admin
    ? await downloadPreviewArtifactFile({ admin, artifactPath, relativePath: "index.html" })
    : null;
  if (!file) return new NextResponse("Artifact not found", { status: 404 });

  const shimHints = [{ path: "package.json", content: "{}", sizeBytes: 2 }];
  const fw = detectImportedFramework(shimHints);
  const legacy = analyzeLegacyAdapter(shimHints, fw);
  let html = injectPreviewShims(file.data.toString("utf8"), legacy);
  html = rewritePreviewArtifactHtml(html, projectId, artifactId, virtualRoute);

  const bootstrapAssert = assertPreviewBootstrapClean(html, projectId);
  if (!bootstrapAssert.ok) {
    const leakPanel = buildPreviewBootstrapLeakPanel({
      projectId,
      leaks: bootstrapAssert.leaks,
      hydrationCount: bootstrapAssert.hydrationCount,
      repairUrl: `/api/projects/${projectId}/preview/inner-route-repair`,
    });
    return new NextResponse(leakPanel, {
      status: 200,
      headers: {
        ...CACHE_HEADERS,
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "SAMEORIGIN",
        "X-Preview-Renderable": "false",
      },
    });
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      ...CACHE_HEADERS,
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
      "X-Preview-Renderable": "true",
      "X-Preview-Virtual-Route": virtualRoute,
    },
  });
}

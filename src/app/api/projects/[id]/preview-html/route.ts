import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveProjectPreviewHtml } from "@/lib/preview/project-preview-html";
import { downloadPreviewArtifactFile } from "@/lib/imports/preview-artifact-writer";
import { analyzeLegacyAdapter, injectPreviewShims } from "@/lib/imports/base44-lovable-adapter";
import { detectImportedFramework } from "@/lib/imports/framework-detector";
import { analyzePreviewHtml } from "@/lib/preview/preview-html-diagnostics";
import { loadProjectFilesWithContent } from "@/lib/preview/project-preview-html";

export const dynamic = "force-dynamic";

function wantsHtmlFrame(req: Request): boolean {
  const url = new URL(req.url);
  if (url.searchParams.get("format") === "frame" || url.searchParams.get("format") === "html") {
    return true;
  }
  const accept = req.headers.get("accept") ?? "";
  return accept.includes("text/html");
}

/** Preview status (JSON) or inline HTML frame (`?format=frame`) — never both in one response. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return wantsHtmlFrame(req)
      ? new NextResponse("Unauthorized", { status: 401 })
      : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: proj } = await supabase
    .from("projects")
    .select("id, metadata")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!proj) {
    return wantsHtmlFrame(req)
      ? new NextResponse("Not found", { status: 404 })
      : NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const meta =
    proj.metadata && typeof proj.metadata === "object" && !Array.isArray(proj.metadata)
      ? (proj.metadata as Record<string, unknown>)
      : {};

  const url = new URL(req.url);
  const artifactBuild = url.searchParams.get("artifact")?.trim();
  const artifactPath =
    (typeof meta.preview_artifact_path === "string" && meta.preview_artifact_path) ||
    (artifactBuild ? `${projectId}/${artifactBuild}` : null);

  let html = "";
  let fileCount = 0;
  let archetypeId: string | null = null;
  let diagnostics = analyzePreviewHtml("", []);

  if (artifactPath && meta.preview_renderable === true) {
    const admin = createSupabaseAdmin();
    const file = admin
      ? await downloadPreviewArtifactFile({
          admin,
          artifactPath,
          relativePath: "index.html",
        })
      : null;
    if (file) {
      const files = await loadProjectFilesWithContent(supabase, projectId);
      fileCount = files.length;
      const zipFiles = files.map((f) => ({
        path: f.path,
        content: f.content,
        sizeBytes: Buffer.byteLength(f.content, "utf8"),
      }));
      const fw = detectImportedFramework(zipFiles);
      const legacy = analyzeLegacyAdapter(zipFiles, fw);
      html = injectPreviewShims(file.data.toString("utf8"), legacy);
      diagnostics = analyzePreviewHtml(
        html,
        zipFiles.map((f) => ({ path: f.path, content: f.content })),
      );
    }
  }

  if (!html) {
    const resolved = await resolveProjectPreviewHtml(supabase, projectId, meta);
    html = resolved.html;
    fileCount = resolved.fileCount;
    archetypeId = resolved.archetypeId;
    diagnostics = resolved.diagnostics;
  }

  const cacheHeaders = {
    "Cache-Control": "no-store, max-age=0",
  };

  if (wantsHtmlFrame(req)) {
    const body = diagnostics.previewRenderable && html?.trim() ? html : "";
    return new NextResponse(body || "<!DOCTYPE html><html><body><p>Preview not ready</p></body></html>", {
      status: body ? 200 : 503,
      headers: {
        ...cacheHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  }

  const importMeta =
    meta.import_validation && typeof meta.import_validation === "object"
      ? (meta.import_validation as Record<string, unknown>)
      : null;
  const legacyPlatform =
    typeof meta.legacy_platform === "string" ? meta.legacy_platform : null;

  return NextResponse.json(
    {
      ready: diagnostics.previewRenderable,
      previewRenderable: diagnostics.previewRenderable,
      fileCount,
      archetypeId,
      previewHtmlLength: html.length,
      blockedReason: diagnostics.errorCode ?? null,
      errorMessage: diagnostics.errorMessage ?? null,
      sourceIntegrityOk: diagnostics.sourceIntegrityOk,
      hasRootElement: diagnostics.hasRootElement,
      runtime: {
        framework: importMeta?.framework ?? meta.import_framework ?? null,
        entryFile: importMeta?.entryFile ?? meta.import_entry ?? null,
        previewEntry: importMeta?.previewEntry ?? null,
        legacyPlatform,
        buildCommand: importMeta?.buildCommand ?? null,
      },
    },
    { headers: cacheHeaders },
  );
}

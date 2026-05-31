import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectPreviewHtml } from "@/lib/preview/project-preview-html";

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

  const { html, fileCount, archetypeId, diagnostics } = await resolveProjectPreviewHtml(
    supabase,
    projectId,
    meta,
  );

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

  return NextResponse.json(
    {
      ready: diagnostics.previewRenderable,
      previewRenderable: diagnostics.previewRenderable,
      fileCount,
      archetypeId,
      previewHtmlLength: html.length,
      blockedReason: diagnostics.errorCode ?? null,
      sourceIntegrityOk: diagnostics.sourceIntegrityOk,
    },
    { headers: cacheHeaders },
  );
}

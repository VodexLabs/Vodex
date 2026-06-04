import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { requireMutationProjectId, isNextResponse } from "@/lib/ids/api-mutation-guard";
import { loadProjectFilesWithContent } from "@/lib/preview/project-preview-html";
import { repairImportedThinFiles } from "@/lib/imports/repair-imported-thin-files";
import { persistRepairedImportFiles } from "@/lib/imports/persist-repaired-import-files";
import { isThinGeneratedFile } from "@/lib/build/meaningful-file-guard";

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

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Service role unavailable" }, { status: 503 });

  const files = await loadProjectFilesWithContent(supabase, projectId);
  const zipFiles = files.map((f) => ({
    path: f.path,
    content: f.content,
    sizeBytes: Buffer.byteLength(f.content, "utf8"),
  }));

  const thinBefore = zipFiles
    .filter((f) => isThinGeneratedFile({ path: f.path, content: f.content }))
    .map((f) => f.path);

  const { files: repairedFiles, repairedPaths } = repairImportedThinFiles(zipFiles);
  if (repairedPaths.length === 0) {
    return NextResponse.json({
      ok: true,
      updated: 0,
      thinBefore,
      message: "No known thin import shells required repair",
    });
  }

  const persisted = await persistRepairedImportFiles({
    admin,
    projectId,
    ownerId: user.id,
    files: repairedFiles,
    repairedPaths,
  });

  if (!persisted.ok) {
    return NextResponse.json({ error: persisted.error ?? "Persist failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    updated: persisted.updated,
    repairedPaths,
    thinBefore,
  });
}

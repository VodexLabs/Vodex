import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { reconcileProjectBuildState } from "@/lib/build/reconcile-project-build";
import { isZipImportProject, readImportMeta, preferredEntryFile } from "@/lib/projects/imported-project-state";
import { requireAuthUser, requireMutationProjectId, isNextResponse } from "@/lib/ids/api-mutation-guard";

export const dynamic = "force-dynamic";

/** Normalize imported ZIP app: entry file, preview flags, routes — no AI rebuild. */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await ctx.params;
  const projectId = requireMutationProjectId(rawId);
  if (isNextResponse(projectId)) return projectId;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authUser = requireAuthUser(user);
  if (isNextResponse(authUser)) return authUser;

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, app_name, metadata, build_status")
    .eq("id", projectId)
    .eq("owner_id", authUser.id)
    .maybeSingle();

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const meta =
    project.metadata && typeof project.metadata === "object" && !Array.isArray(project.metadata)
      ? (project.metadata as Record<string, unknown>)
      : {};

  if (!isZipImportProject(meta) && meta.source !== "zip_import") {
    return NextResponse.json({ error: "Only imported apps can be prepared this way" }, { status: 400 });
  }

  const admin = createServiceRoleClient() ?? supabase;

  const { data: fileRows } = await admin
    .from("app_files")
    .select("path, content")
    .eq("project_id", projectId)
    .limit(500);

  const files = (fileRows ?? []).map((f) => ({ path: f.path, content: f.content ?? "" }));
  if (files.length === 0) {
    return NextResponse.json({ error: "No imported files found" }, { status: 400 });
  }

  const paths = files.map((f) => f.path);
  const entry = preferredEntryFile(paths) ?? paths.find((p) => /\.html?$/i.test(p)) ?? paths[0];
  const imp = readImportMeta(meta);
  const previewReady = Boolean(entry && (imp.preview_ready || /\.html?$/i.test(entry ?? "")));

  const nextMeta = {
    ...meta,
    source: "zip_import",
    lifecycle_status: previewReady ? "imported_preview_ready" : "imported",
    preview_ready: previewReady,
    preview_honest: previewReady,
    file_count: files.length,
    import: {
      ...imp,
      preview_ready: previewReady,
      entry_file: entry,
      prepared_at: new Date().toISOString(),
    },
  };

  await admin
    .from("projects")
    .update({
      build_status: "imported",
      metadata: nextMeta,
    } as never)
    .eq("id", projectId)
    .eq("owner_id", authUser.id);

  await reconcileProjectBuildState(admin, projectId, authUser.id);

  return NextResponse.json({
    ok: true,
    fileCount: files.length,
    entryFile: entry,
    previewReady,
  });
}

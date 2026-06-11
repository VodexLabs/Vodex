import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { importZipBinaryAssets } from "@/lib/import/import-zip-binary-assets";
import { ZIP_IMPORT_BUCKET } from "@/lib/import/zip-storage";

/** Re-extract binary assets from stored ZIP archive into project media. */
export async function POST(
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
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: imported } = await supabase
    .from("imported_projects")
    .select("source_archive_path")
    .eq("project_id", projectId)
    .maybeSingle();
  if (!imported?.source_archive_path) {
    return NextResponse.json({ error: "No ZIP archive found for this project" }, { status: 404 });
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
  }

  const { data: blob, error: dlErr } = await admin.storage
    .from(ZIP_IMPORT_BUCKET)
    .download(imported.source_archive_path);
  if (dlErr || !blob) {
    return NextResponse.json({ error: dlErr?.message ?? "Archive not found" }, { status: 404 });
  }

  const buf = Buffer.from(await blob.arrayBuffer());
  const result = await importZipBinaryAssets({
    admin,
    zipBuffer: buf,
    userId: user.id,
    projectId,
  });

  return NextResponse.json({
    ok: true,
    imported: result.imported,
    skipped: result.skipped,
    errors: result.errors.slice(0, 10),
  });
}

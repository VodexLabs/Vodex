import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeZipEntryPath,
  shouldSkipZipPath,
  detectFrameworkHint,
  accumulateIfOk,
  ZIP_IMPORT_LIMITS,
  type ZipImportFile,
} from "@/lib/zip/safe-import-paths";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const TEXT_EXT = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "json",
  "md",
  "mdx",
  "css",
  "scss",
  "html",
  "htm",
  "svg",
  "txt",
  "env",
  "yml",
  "yaml",
]);

const FY_REMOVE = /[^a-z0-9-]/g;

function slugFromName(name: string): string {
  const base = name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(FY_REMOVE, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || "imported-app";
}

function extOf(path: string): string {
  const i = path.lastIndexOf(".");
  return i >= 0 ? path.slice(i + 1).toLowerCase() : "";
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing "file" field' }, { status: 400 });
  }

  const nameField = form.get("name");
  const displayName =
    typeof nameField === "string" && nameField.trim().length > 0 ? nameField.trim() : null;

  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".zip")) {
    return NextResponse.json({ error: "Only .zip archives are supported" }, { status: 400 });
  }
  const mime = file.type;
  if (mime && mime !== "application/zip" && mime !== "application/x-zip-compressed") {
    return NextResponse.json({ error: `Unsupported MIME type: ${mime}` }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `ZIP too large (max ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB)` },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch {
    return NextResponse.json({ error: "Invalid or corrupted ZIP file" }, { status: 400 });
  }

  const acc: { files: ZipImportFile[]; total: number } = { files: [], total: 0 };

  for (const [rawPath, entry] of Object.entries(zip.files)) {
    if (!entry || entry.dir) continue;
    const normalized = normalizeZipEntryPath(rawPath);
    if (!normalized || shouldSkipZipPath(normalized)) continue;
    const ext = extOf(normalized);
    if (!TEXT_EXT.has(ext)) continue;

    let content: string;
    try {
      content = await entry.async("string");
    } catch {
      continue;
    }
    const ok = accumulateIfOk(acc, normalized, content);
    if (!ok.ok) {
      return NextResponse.json({ error: ok.error }, { status: 400 });
    }
  }

  if (acc.files.length === 0) {
    return NextResponse.json(
      { error: "No importable text files found (after skipping build artifacts and dependencies)" },
      { status: 400 },
    );
  }

  const framework = detectFrameworkHint(acc.files);
  const baseSlug = slugFromName(file.name);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;
  const defaultTitle = baseSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const { data: project, error: projErr } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      name: displayName ?? defaultTitle,
      slug,
      status: "draft",
      framework: framework === "nextjs" ? "nextjs" : framework === "unknown" ? "nextjs" : framework,
      metadata: {
        import: { original_name: file.name, file_count: acc.files.length, framework },
      } as Json,
    } as never)
    .select("id")
    .single();

  if (projErr || !project?.id) {
    return NextResponse.json(
      { error: projErr?.message ?? "Could not create project" },
      { status: 500 },
    );
  }

  const projectId = project.id;
  const storagePath = `${user.id}/imports/${projectId}.zip`;

  const { error: upErr } = await supabase.storage.from("media").upload(storagePath, buf, {
    contentType: "application/zip",
    upsert: true,
  });
  if (upErr) {
    await supabase.from("projects").delete().eq("id", projectId).eq("owner_id", user.id);
    return NextResponse.json(
      { error: `Storage upload failed: ${upErr.message}` },
      { status: 500 },
    );
  }

  const { data: publicData } = supabase.storage.from("media").getPublicUrl(storagePath);
  const publicUrl = publicData.publicUrl;

  const rows = acc.files.map((f) => ({
    project_id: projectId,
    path: f.path,
    content: f.content,
    mime_type: "text/plain",
    size_bytes: f.sizeBytes,
  }));

  const { error: filesErr } = await supabase.from("app_files").upsert(rows, {
    onConflict: "project_id,path",
  });
  if (filesErr) {
    await supabase.storage.from("media").remove([storagePath]);
    await supabase.from("projects").delete().eq("id", projectId).eq("owner_id", user.id);
    return NextResponse.json({ error: filesErr.message }, { status: 500 });
  }

  const { error: impErr } = await supabase.from("imported_projects").insert({
    user_id: user.id,
    project_id: projectId,
    source_archive_path: storagePath,
    framework_detected: framework,
    meta: {
      public_url: publicUrl,
      limits: ZIP_IMPORT_LIMITS,
    } as Json,
  });
  if (impErr && process.env.NODE_ENV !== "production") {
    console.warn("[import-zip] imported_projects:", impErr.message);
  }

  return NextResponse.json({
    projectId,
    fileCount: acc.files.length,
    framework,
    redirectTo: `/create?projectId=${projectId}&mode=build`,
  });
}

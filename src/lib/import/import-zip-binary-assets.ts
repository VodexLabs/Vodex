import JSZip from "jszip";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeZipEntryPath,
  shouldSkipZipPath,
  isSecretZipPath,
} from "@/lib/import/zip-file-validator";

const BINARY_EXT = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "ico",
  "avif",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
  "mp4",
  "webm",
  "mp3",
  "wav",
  "pdf",
]);

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  avif: "image/avif",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  pdf: "application/pdf",
};

export type ZipBinaryImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

function extOf(path: string): string {
  const i = path.lastIndexOf(".");
  return i >= 0 ? path.slice(i + 1).toLowerCase() : "";
}

function assetTypeForMime(mime: string): "image" | "video" | "document" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/") || mime.startsWith("audio/")) return "video";
  return "document";
}

function safeStorageName(relativePath: string): string {
  return relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
}

/** Extract binary files from ZIP archive into project media storage. */
export async function importZipBinaryAssets(input: {
  admin: SupabaseClient;
  zipBuffer: Buffer;
  userId: string;
  projectId: string;
}): Promise<ZipBinaryImportResult> {
  const result: ZipBinaryImportResult = { imported: 0, skipped: 0, errors: [] };

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(input.zipBuffer);
  } catch {
    result.errors.push("Could not read ZIP for binary assets");
    return result;
  }

  for (const [rawPath, entry] of Object.entries(zip.files)) {
    if (!entry || entry.dir) continue;

    const normalized = normalizeZipEntryPath(rawPath);
    if (!normalized) {
      result.skipped += 1;
      continue;
    }
    if (shouldSkipZipPath(normalized)) {
      result.skipped += 1;
      continue;
    }
    if (isSecretZipPath(normalized)) {
      result.skipped += 1;
      continue;
    }

    const ext = extOf(normalized);
    if (!BINARY_EXT.has(ext)) {
      result.skipped += 1;
      continue;
    }

    let data: Buffer;
    try {
      data = Buffer.from(await entry.async("arraybuffer"));
    } catch {
      result.skipped += 1;
      continue;
    }

    if (data.length === 0 || data.length > 50 * 1024 * 1024) {
      result.skipped += 1;
      continue;
    }

    const mime = MIME[ext] ?? "application/octet-stream";
    const rel = safeStorageName(normalized);
    const storagePath = `${input.userId}/${input.projectId}/imported/${rel.replace(/\//g, "__")}`;

    const { error: uploadError } = await input.admin.storage.from("media").upload(storagePath, data, {
      contentType: mime,
      upsert: true,
    });
    if (uploadError) {
      result.errors.push(`${rel}: ${uploadError.message}`);
      continue;
    }

    const {
      data: { publicUrl },
    } = input.admin.storage.from("media").getPublicUrl(storagePath);

    const filename = rel.split("/").pop() ?? rel;
    const { data: existing } = await input.admin
      .from("media_assets")
      .select("id")
      .eq("project_id", input.projectId)
      .eq("storage_path", storagePath)
      .maybeSingle();
    if (existing?.id) {
      result.skipped += 1;
      continue;
    }

    const { error: dbError } = await input.admin.from("media_assets").insert({
      user_id: input.userId,
      project_id: input.projectId,
      filename,
      storage_path: storagePath,
      public_url: publicUrl,
      mime_type: mime,
      size_bytes: data.length,
      asset_type: assetTypeForMime(mime),
      generated: false,
      tags: ["zip_import", rel],
    } as never);

    if (dbError) {
      result.errors.push(`${rel}: ${dbError.message}`);
      continue;
    }

    result.imported += 1;
  }

  return result;
}

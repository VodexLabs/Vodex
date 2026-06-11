import JSZip from "jszip";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeZipEntryPath, shouldSkipZipPath } from "@/lib/import/zip-file-validator";
import { ensurePublicBucket } from "@/lib/supabase/ensure-storage-bucket";

const MEDIA_BUCKET = "media";

const FAVICON_PATH_PREFS = [
  "public/favicon.png",
  "public/favicon.ico",
  "public/icon.png",
  "public/apple-touch-icon.png",
  "favicon.png",
  "favicon.ico",
  "icon.png",
  "src/assets/favicon.png",
  "src/assets/icon.png",
];

const MIME: Record<string, string> = {
  png: "image/png",
  ico: "image/x-icon",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

function extOf(path: string): string {
  const i = path.lastIndexOf(".");
  return i >= 0 ? path.slice(i + 1).toLowerCase() : "";
}

async function findFaviconInZip(
  zip: JSZip,
  preferredPath?: string | null,
): Promise<{ path: string; data: Buffer; mime: string } | null> {
  if (preferredPath) {
    const normalized = normalizeZipEntryPath(preferredPath);
    if (normalized) {
      const entry = zip.file(normalized) ?? zip.file(preferredPath);
      if (entry && !entry.dir) {
        const data = Buffer.from(await entry.async("arraybuffer"));
        if (data.length > 0 && data.length <= 2 * 1024 * 1024) {
          const ext = extOf(normalized);
          return { path: normalized, data, mime: MIME[ext] ?? "image/png" };
        }
      }
    }
  }

  for (const pref of FAVICON_PATH_PREFS) {
    const entry = zip.file(pref);
    if (!entry || entry.dir) continue;
    const data = Buffer.from(await entry.async("arraybuffer"));
    if (data.length === 0 || data.length > 2 * 1024 * 1024) continue;
    const ext = extOf(pref);
    return { path: pref, data, mime: MIME[ext] ?? "image/png" };
  }

  for (const [rawPath, entry] of Object.entries(zip.files)) {
    if (!entry || entry.dir) continue;
    const normalized = normalizeZipEntryPath(rawPath);
    if (!normalized || shouldSkipZipPath(normalized)) continue;
    if (!/(?:favicon|icon|logo|apple-touch)/i.test(normalized)) continue;
    if (!/\.(png|ico|webp|jpg|jpeg)$/i.test(normalized)) continue;
    if (!/(?:^public\/|^src\/assets\/|^assets\/)/i.test(normalized)) continue;
    const data = Buffer.from(await entry.async("arraybuffer"));
    if (data.length === 0 || data.length > 2 * 1024 * 1024) continue;
    const ext = extOf(normalized);
    return { path: normalized, data, mime: MIME[ext] ?? "image/png" };
  }

  return null;
}

/** Upload favicon from ZIP archive and return public icon_url. */
export async function persistImportedAppIconFromZip(input: {
  admin: SupabaseClient;
  userId: string;
  projectId: string;
  zipBuffer: Buffer;
  preferredPath?: string | null;
}): Promise<{ icon_url: string | null; icon_path: string | null }> {
  const bucket = await ensurePublicBucket(input.admin, MEDIA_BUCKET, {
    fileSizeLimit: 5 * 1024 * 1024,
  });
  if (!bucket.ok) return { icon_url: null, icon_path: null };

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(input.zipBuffer);
  } catch {
    return { icon_url: null, icon_path: null };
  }

  const favicon = await findFaviconInZip(zip, input.preferredPath);
  if (!favicon) return { icon_url: null, icon_path: null };

  const ext = extOf(favicon.path) || "png";
  const storagePath = `${input.userId}/${input.projectId}/app-icon.${ext}`;

  const { error: uploadError } = await input.admin.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, favicon.data, { contentType: favicon.mime, upsert: true });
  if (uploadError) return { icon_url: null, icon_path: favicon.path };

  const {
    data: { publicUrl },
  } = input.admin.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);

  await input.admin
    .from("projects")
    .update({ icon_url: publicUrl } as never)
    .eq("id", input.projectId)
    .eq("owner_id", input.userId);

  return { icon_url: publicUrl, icon_path: favicon.path };
}

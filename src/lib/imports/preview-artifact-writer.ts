import "server-only";

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensurePrivateBucket } from "@/lib/supabase/ensure-storage-bucket";
import {
  downloadPreviewArtifactFile,
  PREVIEW_ARTIFACTS_BUCKET,
} from "@/lib/imports/preview-artifact-storage";

export { downloadPreviewArtifactFile, PREVIEW_ARTIFACTS_BUCKET };

import { ZIP_IMPORT_MAX_BYTES } from "@/lib/import/zip-import-limits";
import { sanitizePreviewBootstrapState } from "@/lib/preview/preview-bootstrap-sanitizer";
import { TEXT_ARTIFACT_EXT } from "@/lib/preview/preview-path-leak-scanner";

const MAX_ARTIFACT_BYTES = ZIP_IMPORT_MAX_BYTES;

async function walkDir(dir: string, base = dir): Promise<Array<{ rel: string; abs: string }>> {
  const out: Array<{ rel: string; abs: string }> = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const abs = path.join(dir, ent.name);
    const rel = path.relative(base, abs).replace(/\\/g, "/");
    if (ent.isDirectory()) {
      out.push(...(await walkDir(abs, base)));
    } else if (ent.isFile()) {
      out.push({ rel, abs });
    }
  }
  return out;
}

function contentTypeFor(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "html") return "text/html; charset=utf-8";
  if (ext === "js" || ext === "mjs") return "application/javascript; charset=utf-8";
  if (ext === "css") return "text/css; charset=utf-8";
  if (ext === "json") return "application/json; charset=utf-8";
  if (ext === "svg") return "image/svg+xml";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "woff2") return "font/woff2";
  return "application/octet-stream";
}

export async function uploadPreviewArtifacts(input: {
  admin: SupabaseClient;
  projectId: string;
  buildId: string;
  sourceDir: string;
}): Promise<{ ok: true; artifactPath: string; fileCount: number } | { ok: false; error: string }> {
  const bucket = await ensurePrivateBucket(input.admin, PREVIEW_ARTIFACTS_BUCKET, {
    fileSizeLimit: 5 * 1024 * 1024,
  });
  if (!bucket.ok) return { ok: false, error: bucket.error };

  const prefix = `${input.projectId}/${input.buildId}`;
  const files = await walkDir(input.sourceDir);
  let total = 0;
  let uploaded = 0;

  for (const file of files) {
    let buf = await fs.readFile(file.abs);
    if (TEXT_ARTIFACT_EXT.test(file.rel)) {
      const text = buf.toString("utf8");
      const isJs = /\.m?js$/i.test(file.rel);
      const sanitized = sanitizePreviewBootstrapState(text, input.projectId, "/", {
        rewriteAssetUrls: !isJs,
      });
      buf = Buffer.from(sanitized, "utf8");
    }
    total += buf.length;
    if (total > MAX_ARTIFACT_BYTES) {
      return { ok: false, error: "Preview artifact exceeds size limit" };
    }
    const storagePath = `${prefix}/${file.rel}`;
    const { error } = await input.admin.storage.from(PREVIEW_ARTIFACTS_BUCKET).upload(storagePath, buf, {
      contentType: contentTypeFor(file.rel),
      upsert: true,
    });
    if (error) return { ok: false, error: error.message };
    uploaded += 1;
  }

  return { ok: true, artifactPath: prefix, fileCount: uploaded };
}

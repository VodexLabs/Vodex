import type { SupabaseClient } from "@supabase/supabase-js";

export const PREVIEW_ARTIFACTS_BUCKET = "preview-artifacts";

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

export async function downloadPreviewArtifactFile(input: {
  admin: SupabaseClient;
  artifactPath: string;
  relativePath: string;
}): Promise<{ data: Buffer; contentType: string } | null> {
  const rel = input.relativePath.replace(/^\/+/, "") || "index.html";
  const storagePath = `${input.artifactPath}/${rel}`;
  const { data, error } = await input.admin.storage
    .from(PREVIEW_ARTIFACTS_BUCKET)
    .download(storagePath);
  if (error || !data) return null;
  const buf = Buffer.from(await data.arrayBuffer());
  return { data: buf, contentType: contentTypeFor(rel) };
}

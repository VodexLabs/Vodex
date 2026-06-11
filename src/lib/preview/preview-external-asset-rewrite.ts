/** Rewrite dead third-party storage URLs (Base44-era Supabase buckets) in preview bundles. */

/** 1×1 transparent GIF — safe placeholder for missing remote images in preview. */
export const PREVIEW_PLACEHOLDER_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const SUPABASE_STORAGE_RE =
  /https?:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/[^"'`\s)>\]]+/gi;

/** Replace foreign Supabase storage URLs with an inline placeholder. */
export function rewriteForeignSupabaseStorageUrls(content: string): string {
  if (!content.includes("supabase.co")) return content;
  return content.replace(SUPABASE_STORAGE_RE, PREVIEW_PLACEHOLDER_IMAGE);
}

/** Extract artifact build id from a preview-runtime mount path. */
export function extractArtifactIdFromRuntimeUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const m = /\/preview-runtime\/[^/]+\/([a-f0-9-]{36})/i.exec(url.split("?")[0] ?? url);
  return m?.[1] ?? null;
}

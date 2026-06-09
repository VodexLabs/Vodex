import { tryNormalizeInternalPreviewUrl } from "@/lib/preview/internal-preview-url";

/** Normalize preview_url from DB rows before sending to clients. */
export function normalizeProjectPreviewUrlField(
  previewUrl: string | null | undefined,
): string | null {
  if (!previewUrl?.trim()) return null;
  const normalized = tryNormalizeInternalPreviewUrl(previewUrl);
  if (normalized && normalized !== previewUrl.trim()) {
    if (typeof console !== "undefined") {
      console.warn("[preview-url] API corrected stale preview_url", {
        from: previewUrl,
        to: normalized,
      });
    }
    return normalized;
  }
  return previewUrl.trim();
}

/**
 * Shared preview artifact file download + text sanitization (P1.3.38).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { downloadPreviewArtifactFile } from "@/lib/imports/preview-artifact-storage";
import { sanitizePreviewBootstrapState } from "@/lib/preview/preview-bootstrap-sanitizer";
import { scanBootstrapLeaksDetailed } from "@/lib/preview/preview-bootstrap-sanitizer";

export const PREVIEW_TEXT_ASSET_EXT =
  /\.(html?|js|mjs|cjs|css|json|txt|rsc|map|webmanifest|xml)$/i;

export function isPreviewTextAssetPath(relativePath: string, contentType?: string): boolean {
  const lower = relativePath.toLowerCase();
  if (PREVIEW_TEXT_ASSET_EXT.test(lower)) return true;
  if (!contentType) return false;
  const ct = contentType.toLowerCase();
  return (
    ct.includes("javascript") ||
    ct.includes("json") ||
    ct.includes("css") ||
    ct.includes("xml") ||
    ct.includes("html")
  );
}

export function sanitizeServedPreviewAssetText(
  text: string,
  projectId: string,
  virtualRoute = "/",
): string {
  return sanitizePreviewBootstrapState(text, projectId, virtualRoute, {
    rewriteAssetUrls: false,
  });
}

export async function loadSanitizedPreviewArtifactAsset(input: {
  admin: SupabaseClient;
  artifactPath: string;
  relativePath: string;
  projectId: string;
  virtualRoute?: string;
}): Promise<{ data: Buffer; contentType: string; leakCount: number } | null> {
  const file = await downloadPreviewArtifactFile({
    admin: input.admin,
    artifactPath: input.artifactPath,
    relativePath: input.relativePath,
  });
  if (!file) return null;

  if (!isPreviewTextAssetPath(input.relativePath, file.contentType)) {
    return { data: file.data, contentType: file.contentType, leakCount: 0 };
  }

  const raw = file.data.toString("utf8");
  const sanitized = sanitizeServedPreviewAssetText(raw, input.projectId, input.virtualRoute ?? "/");
  const leaks = scanBootstrapLeaksDetailed(sanitized, input.projectId, {
    excludePlatformInjections: false,
    file: input.relativePath,
  }).filter((l) => !l.safe);

  return {
    data: Buffer.from(sanitized, "utf8"),
    contentType: file.contentType,
    leakCount: leaks.length,
  };
}

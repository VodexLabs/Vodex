/** Remove embedded preview-proxy paths from artifact HTML/JS (fixes Next.js router 404). */

import { sanitizePreviewBootstrapState } from "@/lib/preview/preview-bootstrap-sanitizer";

export function stripPreviewPlatformPathsFromText(
  text: string,
  projectId: string,
  opts?: { rewriteAssetUrls?: boolean; virtualRoute?: string },
): string {
  return sanitizePreviewBootstrapState(text, projectId, opts?.virtualRoute ?? "/", {
    rewriteAssetUrls: opts?.rewriteAssetUrls,
  });
}

import "server-only";

import {
  buildStaticPreviewHtml,
  type PreviewHtmlOptions,
} from "@/lib/preview/static-preview-builder";
import type { PublishedSnapshotFile } from "@/lib/publish/published-snapshot";
import { pickPreviewEntry } from "@/lib/preview/preview-sandbox";

/** Resolve HTML for iframe preview from published/preview snapshot files. */
export function resolveSnapshotHtml(
  files: PublishedSnapshotFile[],
  options?: PreviewHtmlOptions,
): string | null {
  const entry = pickPreviewEntry(files);
  if (!entry) return null;
  if (entry.kind === "html") {
    const raw = entry.content;
    if (raw.includes("generated-app-preview-root")) return raw;
    return buildStaticPreviewHtml(files, options);
  }
  return buildStaticPreviewHtml(files, options);
}

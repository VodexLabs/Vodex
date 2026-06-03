import { analyzePreviewHtml } from "@/lib/preview/preview-html-diagnostics";
import type { BuildFile } from "@/lib/build/generated-file-utils";

export type PreviewHealthResult = {
  previewRenderable: boolean;
  sourceIntegrityOk: boolean;
  blockedReason: string | null;
  htmlLength: number;
  hasRootElement: boolean;
  errorCode?: string;
  errorMessage?: string;
};

const BLANK_MARKERS = [
  /no renderable content/i,
  /preview not ready/i,
  /preview blocked/i,
];

export function checkPreviewHealth(
  html: string,
  sourceFiles: BuildFile[],
): PreviewHealthResult {
  const trimmed = html.trim();
  if (!trimmed || trimmed.length < 400) {
    return {
      previewRenderable: false,
      sourceIntegrityOk: false,
      blockedReason: "Preview HTML is empty or too small",
      htmlLength: trimmed.length,
      hasRootElement: false,
      errorCode: "empty_preview_html",
    };
  }

  for (const marker of BLANK_MARKERS) {
    if (marker.test(trimmed)) {
      return {
        previewRenderable: false,
        sourceIntegrityOk: false,
        blockedReason: "Preview contains no renderable UI content",
        htmlLength: trimmed.length,
        hasRootElement: false,
        errorCode: "empty_preview_html",
      };
    }
  }

  const diagnostics = analyzePreviewHtml(trimmed, sourceFiles);
  const hasRoot =
    diagnostics.hasRootElement ||
    trimmed.includes("dreamos-preview-root") ||
    trimmed.includes("generated-app-preview-root");

  if (!hasRoot && trimmed.length < 800) {
    return {
      previewRenderable: false,
      sourceIntegrityOk: diagnostics.sourceIntegrityOk,
      blockedReason: diagnostics.errorMessage ?? "Missing preview root element",
      htmlLength: diagnostics.htmlLength,
      hasRootElement: false,
      errorCode: diagnostics.errorCode,
      errorMessage: diagnostics.errorMessage,
    };
  }

  if (!diagnostics.previewRenderable) {
    return {
      previewRenderable: false,
      sourceIntegrityOk: diagnostics.sourceIntegrityOk,
      blockedReason: diagnostics.errorMessage ?? "Preview failed validation",
      htmlLength: diagnostics.htmlLength,
      hasRootElement: hasRoot,
      errorCode: diagnostics.errorCode,
      errorMessage: diagnostics.errorMessage,
    };
  }

  return {
    previewRenderable: true,
    sourceIntegrityOk: diagnostics.sourceIntegrityOk,
    blockedReason: null,
    htmlLength: diagnostics.htmlLength,
    hasRootElement: hasRoot,
  };
}

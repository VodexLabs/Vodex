import type { BuildFile } from "@/lib/build/generated-file-utils";
import { evaluateSourceIntegrity } from "@/lib/build/source-integrity-validator";
import { truncateLargeDiagnosticString } from "@/lib/diagnostics/truncate-large-diagnostic-string";

function truncatePreviewSnippet(html: string): string {
  return truncateLargeDiagnosticString(html, 2000);
}

export type PreviewHtmlDiagnostics = {
  htmlLength: number;
  hasRootElement: boolean;
  sourceFileCount: number;
  sourceIntegrityOk: boolean;
  previewRenderable: boolean;
  errorCode?: string;
  errorMessage?: string;
};

export function analyzePreviewHtml(
  html: string,
  files: BuildFile[],
  options?: { previewSessionOk?: boolean },
): PreviewHtmlDiagnostics {
  const htmlLength = html.length;
  const hasRootElement = html.includes("generated-app-preview-root");
  const sourceFileCount = files.length;
  const integrity = evaluateSourceIntegrity(files, {
    previewHtmlLength: htmlLength,
    previewSessionOk: options?.previewSessionOk,
    previewHtmlSnippet: truncatePreviewSnippet(html),
  });

  let errorCode: string | undefined;
  let errorMessage: string | undefined;

  if (!hasRootElement || htmlLength < 400) {
    errorCode = "empty_preview_html";
    errorMessage = "Preview HTML is too small or missing the app root.";
  } else if (/no renderable content/i.test(html)) {
    errorCode = "empty_preview_html";
    errorMessage = "Preview HTML has no renderable body.";
  } else if (!integrity.sourceIntegrityOk) {
    errorCode = "source_integrity_incomplete";
    errorMessage = integrity.blockedReason ?? "Source integrity check failed.";
  } else if (!integrity.previewRenderable) {
    errorCode = "preview_not_renderable";
    errorMessage = "Source is present but preview is not ready.";
  }

  const previewRenderable = integrity.previewRenderable && !errorCode;

  return {
    htmlLength,
    hasRootElement,
    sourceFileCount,
    sourceIntegrityOk: integrity.sourceIntegrityOk,
    previewRenderable,
    errorCode,
    errorMessage,
  };
}

/**
 * Detect regex-static-preview artifacts (orphan attributes, truncated JSX).
 */

export type BrokenPreviewSnapshotReason =
  | "orphan_class_attribute"
  | "lone_close_paren"
  | "low_tag_ratio"
  | "markdown_fence_leak"
  | "truncated_jsx_fragment";

const ORPHAN_CLASS_RE = /(?:^|[\n>])\s*class="[^"]*">\s*(?:\n|$)/m;
const LONE_PAREN_LINE_RE = /^\s*\)\s*$/m;
const ORPHAN_CLASSNAME_TAIL_RE = /className="[^"]*">\s*(?!<)/;
const FENCE_RE = /```(?:tsx|jsx|typescript)?/;

/** True when static HTML likely contains mangled TSX stripper output. */
export function detectBrokenPreviewSnapshot(html: string): {
  broken: boolean;
  reasons: BrokenPreviewSnapshotReason[];
} {
  const reasons: BrokenPreviewSnapshotReason[] = [];
  const bodyMatch = html.match(
    /data-testid="generated-app-preview-root"[^>]*>([\s\S]*)<\/div>\s*<\/body>/i,
  );
  const inner = bodyMatch?.[1] ?? html;

  if (ORPHAN_CLASS_RE.test(inner)) reasons.push("orphan_class_attribute");
  if (LONE_PAREN_LINE_RE.test(inner)) reasons.push("lone_close_paren");
  if (ORPHAN_CLASSNAME_TAIL_RE.test(inner)) reasons.push("truncated_jsx_fragment");
  if (FENCE_RE.test(inner)) reasons.push("markdown_fence_leak");

  const tagCount = (inner.match(/<[a-zA-Z][^>]*>/g) ?? []).length;
  const wordOnlyLines = inner
    .split("\n")
    .filter((l) => /^[A-Za-z][\w\s]{2,40}$/.test(l.trim())).length;
  if (inner.length > 200 && tagCount < 3 && wordOnlyLines >= 2) {
    reasons.push("low_tag_ratio");
  }

  return { broken: reasons.length >= 2, reasons };
}

export function isStaticPreviewHtmlHealthy(
  html: string,
  sourceFileCount: number,
): boolean {
  if (!html.includes("generated-app-preview-root")) return false;
  if (html.length < 400) return false;
  if (/no renderable content/i.test(html)) return false;
  if (sourceFileCount < 4 && html.length < 800) return false;

  const { broken } = detectBrokenPreviewSnapshot(html);
  if (broken) return false;

  return html.length >= 400;
}

import {
  MAX_DIAGNOSTIC_METADATA_CHARS,
  MAX_EVENT_LOG_CHARS,
} from "@/lib/diagnostics/payload-limits";

const DEFAULT_MAX = MAX_EVENT_LOG_CHARS;

/** Truncate large strings in logs/events so Webpack/dev caches are not flooded. */
export function truncateLargeDiagnosticString(
  value: string | null | undefined,
  max = DEFAULT_MAX,
): string {
  if (value == null) return "";
  const s = String(value);
  if (s.length <= max) return s;
  return `${s.slice(0, max)}… [truncated ${s.length - max} chars]`;
}

/** Deep-sanitize metadata objects — never persist full HTML/source blobs. */
/** Build job / diagnostic metadata — 4KB string cap per field. */
export function sanitizeDiagnosticMetadata(
  meta: Record<string, unknown> | null | undefined,
  max = MAX_DIAGNOSTIC_METADATA_CHARS,
): Record<string, unknown> {
  if (!meta || typeof meta !== "object") return {};
  const out: Record<string, unknown> = {};
  const blockedKeys =
    /^(content|source|html|preview_html|previewHtml|srcDoc|file_contents|files|snapshot|raw_body)$/i;

  for (const [key, raw] of Object.entries(meta)) {
    if (blockedKeys.test(key)) {
      if (typeof raw === "string") {
        out[key] = `[omitted ${raw.length} chars]`;
      } else if (Array.isArray(raw)) {
        out[key] = `[omitted array len=${raw.length}]`;
      } else {
        out[key] = "[omitted]";
      }
      continue;
    }
    if (typeof raw === "string") {
      out[key] = truncateLargeDiagnosticString(raw, max);
    } else if (Array.isArray(raw)) {
      out[key] = raw.slice(0, 24).map((item) =>
        typeof item === "string" ? truncateLargeDiagnosticString(item, Math.min(max, 500)) : item,
      );
    } else if (raw && typeof raw === "object") {
      out[key] = sanitizeDiagnosticMetadata(raw as Record<string, unknown>, Math.min(max, 800));
    } else {
      out[key] = raw;
    }
  }
  return out;
}

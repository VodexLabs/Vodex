const REDACT_KEYS =
  /key|secret|token|password|authorization|service_role|apikey|bearer|cookie|otp|otp_hash/i;

export function sanitizeDiagnosticMetadata(
  meta?: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!meta) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (REDACT_KEYS.test(k)) {
      out[k] = "[redacted]";
      continue;
    }
    if (typeof v === "string") {
      if (v.length > 800) {
        out[k] = `${v.slice(0, 800)}…`;
      } else if (/^sk[-_]/i.test(v) || /^eyJ/.test(v)) {
        out[k] = "[redacted]";
      } else {
        out[k] = v;
      }
      continue;
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = sanitizeDiagnosticMetadata(v as Record<string, unknown>);
      continue;
    }
    out[k] = v;
  }
  return out;
}

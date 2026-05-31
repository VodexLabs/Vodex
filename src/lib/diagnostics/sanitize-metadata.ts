import { sanitizeDiagnosticMetadata as sanitizePayloadMetadata } from "@/lib/diagnostics/truncate-large-diagnostic-string";

const REDACT_KEYS =
  /key|secret|token|password|authorization|service_role|apikey|bearer|cookie|otp|otp_hash/i;

/** Client/server log metadata — redact secrets and cap payload size. */
export function sanitizeDiagnosticMetadata(
  meta?: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!meta) return {};
  const capped = sanitizePayloadMetadata(meta);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(capped)) {
    if (REDACT_KEYS.test(k)) {
      out[k] = "[redacted]";
      continue;
    }
    if (typeof v === "string" && (/^sk[-_]/i.test(v) || /^eyJ/.test(v))) {
      out[k] = "[redacted]";
      continue;
    }
    out[k] = v;
  }
  return out;
}

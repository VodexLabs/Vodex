import { dreamosLog } from "@/lib/diagnostics/dreamos-logger";

export type AuthDiagnosticEvent =
  | "auth_login_started"
  | "auth_login_failed"
  | "auth_login_succeeded"
  | "oauth_started"
  | "oauth_callback_received"
  | "oauth_callback_failed"
  | "oauth_session_created"
  | "profile_ensure_started"
  | "profile_ensure_failed"
  | "profile_ensure_succeeded"
  | "auth_redirect_mismatch"
  | "auth_cookie_missing";

export function logAuthEvent(
  event: AuthDiagnosticEvent,
  metadata?: Record<string, unknown>,
  severity: "info" | "warn" | "error" = "info",
  source: "client" | "server" = typeof window !== "undefined" ? "client" : "server",
): void {
  dreamosLog({
    source,
    category: "general",
    action: event,
    severity,
    message: event.replace(/_/g, " "),
    metadata: sanitizeAuthMeta(metadata),
  });
}

function sanitizeAuthMeta(meta?: Record<string, unknown>): Record<string, unknown> {
  if (!meta) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    const key = k.toLowerCase();
    if (
      key.includes("password") ||
      key.includes("token") ||
      key.includes("secret") ||
      key.includes("code") ||
      key.includes("refresh") ||
      key.includes("authorization")
    ) {
      continue;
    }
    if (typeof v === "string" && (v.length > 200 || /^eyJ/.test(v))) {
      out[k] = "[redacted]";
      continue;
    }
    out[k] = v;
  }
  return out;
}

import {
  CONNECTION_SETUP_USER_MESSAGE,
  recordSslDiagnostic,
  SSL_SUGGESTED_FIX,
} from "@/lib/network/ssl-diagnostics-store";

const SSL_CODES = new Set([
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "CERT_HAS_EXPIRED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

const RATE_MS = 30_000;
const rateLogAt = new Map<string, number>();

export type SafeFetchError = {
  kind: "network" | "ssl" | "unknown";
  code: string | null;
  message: string;
  hostname: string;
  pathname: string;
  hostBucket: string;
  userMessage: string;
};

export type SafeFetchResult = {
  response: Response | null;
  error: SafeFetchError | null;
};

function hostOnlyFromEnv(name: string): string | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return raw.replace(/^https?:\/\//, "").split("/")[0] ?? null;
  }
}

export function classifyUrlHostname(hostname: string): string {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1") return "localhost";
  if (h === "dreamos86.com" || h.endsWith(".dreamos86.com")) return "dreamos86.com";
  if (h.endsWith(".supabase.co")) return "supabase.co";
  if (h === "auth.dreamos86.com") return "auth.dreamos86.com";
  if (h.endsWith(".vercel.app")) return "vercel.app";
  return "unknown";
}

function parseTarget(input: RequestInfo | URL): { hostname: string; pathname: string } {
  try {
    const url =
      typeof input === "string"
        ? new URL(input)
        : input instanceof URL
          ? input
          : new URL(input.url);
    return { hostname: url.hostname, pathname: url.pathname };
  } catch {
    return { hostname: "unknown", pathname: "/" };
  }
}

function extractErrorCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const e = err as { code?: string; cause?: unknown };
  if (e.code && typeof e.code === "string") return e.code;
  if (e.cause) return extractErrorCode(e.cause);
  return null;
}

function extractMessage(err: unknown): string {
  if (err instanceof Error) {
    const cause = err.cause instanceof Error ? err.cause.message : "";
    return [err.message, cause].filter(Boolean).join(" | ").slice(0, 300);
  }
  return String(err).slice(0, 300);
}

function isSslError(code: string | null, message: string): boolean {
  if (code && SSL_CODES.has(code)) return true;
  return /unable to verify|self.?signed|certificate|UNABLE_TO_VERIFY/i.test(message);
}

function shouldRateLimit(key: string): boolean {
  const now = Date.now();
  const prev = rateLogAt.get(key) ?? 0;
  if (now - prev < RATE_MS) return true;
  rateLogAt.set(key, now);
  return false;
}

function logSanitizedDiagnostic(
  context: string,
  hostname: string,
  pathname: string,
  code: string | null,
  message: string,
): void {
  const key = `${context}|${hostname}|${code ?? message.slice(0, 40)}`;
  if (shouldRateLimit(key)) return;

  const hostBucket = classifyUrlHostname(hostname);
  const appUrlHost = hostOnlyFromEnv("NEXT_PUBLIC_APP_URL");

  console.warn("[DreamOS86][safe-fetch]", {
    context,
    hostname,
    pathname,
    errorCode: code,
    message: message.slice(0, 200),
    NODE_ENV: process.env.NODE_ENV ?? "(unset)",
    NEXT_PUBLIC_APP_URL_host: appUrlHost,
    hostBucket,
  });

  if (isSslError(code, message)) {
    recordSslDiagnostic({
      context,
      hostname,
      pathname,
      errorCode: code,
      message: message.slice(0, 300),
      hostBucket,
      nodeEnv: process.env.NODE_ENV ?? "development",
      appUrlHost,
      suggestedFix: SSL_SUGGESTED_FIX,
    });
  }
}

/**
 * Server-side fetch with sanitized SSL/network diagnostics (no secrets in logs).
 */
export async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  context = "safe_fetch",
): Promise<SafeFetchResult> {
  const { hostname, pathname } = parseTarget(input);
  const hostBucket = classifyUrlHostname(hostname);

  try {
    const response = await fetch(input, init);
    return { response, error: null };
  } catch (err) {
    const code = extractErrorCode(err);
    const message = extractMessage(err);
    logSanitizedDiagnostic(context, hostname, pathname, code, message);

    const ssl = isSslError(code, message);
    const error: SafeFetchError = {
      kind: ssl ? "ssl" : "network",
      code,
      message,
      hostname,
      pathname,
      hostBucket,
      userMessage: CONNECTION_SETUP_USER_MESSAGE,
    };
    return { response: null, error };
  }
}

export function isFetchSslFailure(err: unknown): boolean {
  return isSslError(extractErrorCode(err), extractMessage(err));
}

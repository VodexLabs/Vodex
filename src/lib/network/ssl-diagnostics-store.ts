/** In-memory last SSL/TLS fetch diagnostic (server only, owner-visible via admin API). */

export type SslDiagnosticRecord = {
  at: string;
  context: string;
  hostname: string;
  pathname: string;
  errorCode: string | null;
  message: string;
  hostBucket: string;
  nodeEnv: string;
  appUrlHost: string | null;
  suggestedFix: string;
};

let lastRecord: SslDiagnosticRecord | null = null;

export function recordSslDiagnostic(record: Omit<SslDiagnosticRecord, "at">): void {
  lastRecord = { ...record, at: new Date().toISOString() };
}

export function getLastSslDiagnostic(): SslDiagnosticRecord | null {
  return lastRecord;
}

export const CONNECTION_SETUP_USER_MESSAGE =
  "Connection setup is temporarily unavailable. Please try again shortly.";

export const SSL_SUGGESTED_FIX =
  "Use the Supabase project URL (https://<ref>.supabase.co) locally, or finish custom domain SSL verification before using auth.dreamos86.com.";

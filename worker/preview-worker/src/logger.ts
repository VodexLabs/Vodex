const SECRET_RE =
  /(SUPABASE_SERVICE_ROLE|SECRET|PASSWORD|TOKEN|API_KEY|PRIVATE_KEY|sk_live|sk_test)[^\s]*/gi;

export function redactSecrets(text: string): string {
  return text.replace(SECRET_RE, "[redacted]");
}

export function log(level: "info" | "warn" | "error", msg: string, extra?: Record<string, unknown>) {
  const line = { ts: new Date().toISOString(), level, msg, ...extra };
  const out = JSON.stringify(line);
  if (level === "error") console.error(out);
  else if (level === "warn") console.warn(out);
  else console.log(out);
}

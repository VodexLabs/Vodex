/**
 * CLI-safe Supabase env resolution for debug scripts (no server-only imports).
 */
import fs from "node:fs";
import path from "node:path";

export type SupabaseKeySource = "SUPABASE_SECRET_KEY" | "SUPABASE_SERVICE_ROLE_KEY" | null;

export type SupabaseUrlSource = "SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_URL" | null;

export type SupabaseDebugEnvDiagnostic = {
  supabaseUrl: string | null;
  supabaseUrlSource: SupabaseUrlSource;
  keySource: SupabaseKeySource;
  keyPreview: string | null;
  keyFormat: "jwt" | "sb_secret" | "unknown" | "missing";
  jwtRole: string | null;
  jwtRef: string | null;
  envLocalLoaded: boolean;
  envLocalPath: string;
  errors: string[];
};

function stripQuotes(value: string): string {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

/** Load .env.local from repo root; file values override process.env. */
export function loadCliEnv(repoRoot: string): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === "string") merged[k] = v;
  }

  const envLocalPath = path.join(repoRoot, ".env.local");
  if (!fs.existsSync(envLocalPath)) return merged;

  for (const line of fs.readFileSync(envLocalPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    const val = stripQuotes(t.slice(i + 1));
    if (key) merged[key] = val;
  }

  return merged;
}

export function maskSecret(value: string): string {
  if (value.length <= 12) return "***";
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const json = Buffer.from(b64 + pad, "base64").toString("utf8");
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function detectKeyFormat(key: string): "jwt" | "sb_secret" | "unknown" {
  if (key.startsWith("sb_secret_") || key.startsWith("sb_publishable_")) return "sb_secret";
  if (key.startsWith("eyJ") && key.split(".").length === 3) return "jwt";
  return "unknown";
}

export function resolveSupabaseUrl(env: Record<string, string>): {
  url: string | null;
  source: SupabaseUrlSource;
} {
  const fromSupabase = env.SUPABASE_URL?.trim();
  if (fromSupabase) return { url: fromSupabase, source: "SUPABASE_URL" };
  const fromPublic = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (fromPublic) return { url: fromPublic, source: "NEXT_PUBLIC_SUPABASE_URL" };
  return { url: null, source: null };
}

export function resolveSupabaseServiceKey(env: Record<string, string>): {
  key: string | null;
  source: SupabaseKeySource;
} {
  const secret = env.SUPABASE_SECRET_KEY?.trim();
  if (secret) return { key: secret, source: "SUPABASE_SECRET_KEY" };
  const service = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (service) return { key: service, source: "SUPABASE_SERVICE_ROLE_KEY" };
  return { key: null, source: null };
}

export function rejectAnonKey(key: string, source: SupabaseKeySource): string | null {
  const format = detectKeyFormat(key);
  if (format === "sb_secret") return null;

  const payload = decodeJwtPayload(key);
  const role = typeof payload?.role === "string" ? payload.role : null;
  if (role === "anon") {
    return `Debug script is using anon key; use service role/secret key. (source: ${source ?? "unknown"})`;
  }
  if (format === "jwt" && role !== "service_role") {
    return `JWT key role is "${role ?? "unknown"}" — expected service_role. (source: ${source ?? "unknown"})`;
  }
  return null;
}

export function buildSupabaseDebugEnvDiagnostic(
  repoRoot: string,
  env?: Record<string, string>,
): SupabaseDebugEnvDiagnostic {
  const envLocalPath = path.join(repoRoot, ".env.local");
  const merged = env ?? loadCliEnv(repoRoot);
  const { url, source: supabaseUrlSource } = resolveSupabaseUrl(merged);
  const { key, source: keySource } = resolveSupabaseServiceKey(merged);
  const errors: string[] = [];

  if (!url) errors.push("SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL are both missing.");
  if (!key) errors.push("SUPABASE_SECRET_KEY and SUPABASE_SERVICE_ROLE_KEY are both missing.");

  let keyFormat: SupabaseDebugEnvDiagnostic["keyFormat"] = "missing";
  let jwtRole: string | null = null;
  let jwtRef: string | null = null;

  if (key) {
    keyFormat = detectKeyFormat(key);
    const anonErr = rejectAnonKey(key, keySource);
    if (anonErr) errors.push(anonErr);
    if (keyFormat === "jwt") {
      const payload = decodeJwtPayload(key);
      jwtRole = typeof payload?.role === "string" ? payload.role : null;
      jwtRef = typeof payload?.ref === "string" ? payload.ref : null;
    } else if (keyFormat === "sb_secret") {
      jwtRole = "service_role";
    }
  }

  return {
    supabaseUrl: url,
    supabaseUrlSource,
    keySource,
    keyPreview: key ? maskSecret(key) : null,
    keyFormat,
    jwtRole,
    jwtRef,
    envLocalLoaded: fs.existsSync(envLocalPath),
    envLocalPath,
    errors,
  };
}

export function formatSupabaseDebugEnvDiagnostic(diag: SupabaseDebugEnvDiagnostic): string {
  return JSON.stringify(
    {
      supabaseUrl: diag.supabaseUrl,
      supabaseUrlSource: diag.supabaseUrlSource,
      keySource: diag.keySource,
      keyPreview: diag.keyPreview,
      keyFormat: diag.keyFormat,
      jwtRole: diag.jwtRole,
      jwtRef: diag.jwtRef,
      envLocalLoaded: diag.envLocalLoaded,
      envLocalPath: diag.envLocalPath,
      errors: diag.errors,
    },
    null,
    2,
  );
}

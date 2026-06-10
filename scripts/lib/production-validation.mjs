import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

export const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const DEFAULT_PREVIEW_PROJECT_ID = "ff55c353-aabf-479a-aaec-2138bba9d6b4";

export function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

export function env() {
  if (!process.env.NODE_USE_SYSTEM_CA) process.env.NODE_USE_SYSTEM_CA = "1";
  return { ...process.env, ...loadEnvLocal() };
}

export function createAdmin() {
  const e = env();
  const url = e.NEXT_PUBLIC_SUPABASE_URL;
  const key = e.SUPABASE_SERVICE_ROLE_KEY ?? e.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function resolveValidationUserId(admin, projectId) {
  const e = env();
  if (e.PRODUCTION_VALIDATION_USER_ID?.trim()) return e.PRODUCTION_VALIDATION_USER_ID.trim();
  if (projectId) {
    const { data: proj } = await admin
      .from("projects")
      .select("owner_id")
      .eq("id", projectId)
      .maybeSingle();
    if (proj?.owner_id) return proj.owner_id;
  }
  const email = e.E2E_TEST_EMAIL?.trim() ?? e.PRODUCTION_VALIDATION_EMAIL?.trim();
  if (!email) return null;
  const { data } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  return data?.id ?? null;
}

export function arg(name, fallback = "") {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

export function pass(label) {
  console.log(`✓ ${label}`);
}

export function fail(label, detail) {
  console.error(`✗ ${label}${detail ? `: ${detail}` : ""}`);
}

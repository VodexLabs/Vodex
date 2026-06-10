#!/usr/bin/env npx tsx
/**
 * Runtime preview diagnostics for production validation.
 * Usage: npm run verify:preview-diagnostics -- --project <uuid>
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildPreviewDiagnosticsReport } from "../src/lib/preview/build-preview-diagnostics-report";

const root = path.join(process.cwd());

function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function arg(name: string, fallback: string) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}

const projectId = arg("--project", "ff55c353-aabf-479a-aaec-2138bba9d6b4");

async function main() {
  const envLocal = loadEnvLocal();
  Object.assign(process.env, envLocal);
  if (!process.env.NODE_USE_SYSTEM_CA) process.env.NODE_USE_SYSTEM_CA = "1";
  const env = { ...process.env, ...envLocal };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const report = await buildPreviewDiagnosticsReport(admin, projectId);
  if (!report) {
    console.error(`✗ Project not found: ${projectId}`);
    process.exit(1);
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

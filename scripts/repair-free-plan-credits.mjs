#!/usr/bin/env node
/** Dry-run or apply free plan credit normalization (requires service role for apply). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apply = process.argv.includes("--apply");
const dryRun = process.argv.includes("--dry-run") || !apply;

function loadEnvLocal() {
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

const env = { ...process.env, ...loadEnvLocal() };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY;

console.log(`\n=== repair:free-plan-credits (${dryRun ? "dry-run" : "apply"}) ===\n`);

if (!url || !key) {
  console.log("Skipped — no service role. SQL patch in dreamos-runtime-repair.sql handles normalization.");
  process.exit(0);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await admin
  .from("profiles")
  .select("id, email, plan_id, credits_remaining, credits_limit")
  .eq("plan_id", "free")
  .eq("credits_remaining", 100);

if (error) {
  console.error("✗", error.message);
  process.exit(1);
}

const candidates = data ?? [];
console.log(`Found ${candidates.length} free users with credits_remaining=100`);

if (dryRun) {
  candidates.slice(0, 10).forEach((u) => console.log(`  would normalize ${u.email ?? u.id}`));
  if (candidates.length > 10) console.log(`  ... and ${candidates.length - 10} more`);
  process.exit(0);
}

for (const u of candidates) {
  const { error: upErr } = await admin
    .from("profiles")
    .update({ credits_remaining: 30, credits_limit: 30, monthly_token_limit: 30 })
    .eq("id", u.id)
    .eq("credits_remaining", 100);
  if (upErr) console.error("✗", u.id, upErr.message);
  else console.log("✓ normalized", u.email ?? u.id);
}

console.log("\nDone. Run npm run verify:credit-truth\n");

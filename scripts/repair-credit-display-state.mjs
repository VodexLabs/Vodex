#!/usr/bin/env node
/**
 * Repair credit display state — dry-run by default.
 * Usage: node scripts/repair-credit-display-state.mjs [--apply] [--email=user@example.com]
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

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
const apply = process.argv.includes("--apply");
const emailArg = process.argv.find((a) => a.startsWith("--email="));
const targetEmail = emailArg?.split("=")[1]?.toLowerCase();

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function latestAdminSetBalance(userId) {
  const { data } = await admin
    .from("credit_events")
    .select("metadata, created_at, event_type, amount, balance_after")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  for (const row of data ?? []) {
    if (row.event_type === "admin_set_balance" || row.event_type === "set_balance") {
      const meta = row.metadata ?? {};
      if (typeof meta.after === "number") return meta.after;
      if (typeof row.balance_after === "number") return row.balance_after;
    }
  }
  return null;
}

async function main() {
  let q = admin.from("profiles").select("id,email,credits_remaining,plan_id");
  if (targetEmail) q = q.eq("email", targetEmail);
  const { data: profiles, error } = await q;
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.log(`\n=== repair:credit-display-state (${apply ? "APPLY" : "dry-run"}) ===\n`);

  for (const p of profiles ?? []) {
    const latestSet = await latestAdminSetBalance(p.id);
    if (latestSet == null) continue;
    const current = Number(p.credits_remaining);
    if (Math.abs(current - latestSet) < 0.05) continue;

    console.log(`${p.email}: credits_remaining ${current} → ${latestSet} (latest admin set)`);
    if (apply) {
      await admin.from("profiles").update({ credits_remaining: latestSet }).eq("id", p.id);
      console.log("  applied");
    }
  }

  console.log("\nDone.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

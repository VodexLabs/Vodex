#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const REQUIRED_CONFIRMATION_COLUMNS = [
  "id",
  "created_at",
  "expires_at",
  "consumed_at",
  "admin_id",
  "admin_email",
  "target_id",
  "action_type",
  "action_payload",
  "otp_hash",
  "metadata",
];

const REQUIRED_AUDIT_COLUMNS = [
  "id",
  "created_at",
  "admin_user_id",
  "action",
  "target_user_id",
  "before_state",
  "after_state",
  "ip_address",
  "user_agent",
  "metadata",
];

function mustInclude(rel, needle, label) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  if (!src.includes(needle)) errors.push(`${rel} missing ${label}`);
  else ok.push(label);
}

mustInclude(
  "supabase/migrations/20260622120000_admin_otp_diagnostic_logs.sql",
  "admin_pending_confirmations",
  "migration creates admin_pending_confirmations",
);
mustInclude(
  "supabase/migrations/20260625150000_admin_confirmations_column_repair.sql",
  "action_type",
  "column repair migration",
);
mustInclude("scripts/dreamos-runtime-repair.sql", "admin_pending_confirmations", "repair SQL includes confirmations table");
mustInclude("src/lib/admin/otp-confirmation.ts", "action_type", "otp confirmation uses action_type");
mustInclude("src/app/api/admin/confirmations/request/route.ts", "requireDreamosOwner", "confirmations request is owner-only");

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

if (!url?.includes("wciioegiczwqlmlroley")) {
  errors.push(`NEXT_PUBLIC_SUPABASE_URL must target wciioegiczwqlmlroley (got ${url ?? "missing"})`);
} else {
  ok.push("env points to wciioegiczwqlmlroley");
}

if (url && key) {
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const tables = ["admin_pending_confirmations", "admin_audit_logs", "dreamos_diagnostic_logs", "runtime_diagnostics"];

  for (const table of tables) {
    const { error } = await admin.from(table).select("*").limit(0);
    if (error && /schema cache|could not find|relation.*does not exist/i.test(error.message)) {
      errors.push(`live PostgREST: ${table} missing — apply migration + NOTIFY pgrst`);
    } else if (error) {
      errors.push(`live ${table} probe: ${error.message}`);
    } else {
      ok.push(`live PostgREST: ${table} visible`);
    }
  }

  // Real insert probe — same shape as otp-confirmation.ts
  const { data: ownerRow } = await admin
    .from("profiles")
    .select("id")
    .eq("email", "dreamos86app@gmail.com")
    .maybeSingle();

  const ownerId = ownerRow?.id ?? null;
  const targetId = ownerId;

  if (!ownerId) {
    errors.push("owner profile not found for insert probe");
  } else {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { data: inserted, error: insertErr } = await admin
      .from("admin_pending_confirmations")
      .insert({
        admin_id: ownerId,
        admin_email: "dreamos86app@gmail.com",
        target_id: targetId,
        action_type: "add_tokens",
        action_payload: { action: "add_tokens", targetUserId: targetId, amount: 1 },
        otp_hash: "probe_hash",
        expires_at: expiresAt,
        metadata: { summary: "verify:admin-confirmations probe" },
      })
      .select("id, action_type, action_payload, otp_hash")
      .single();

    if (insertErr) {
      errors.push(`live insert probe failed: ${insertErr.message}`);
    } else if (!inserted?.id) {
      errors.push("live insert probe returned no row");
    } else {
      ok.push("live insert probe: admin_pending_confirmations row created");
      await admin.from("admin_pending_confirmations").delete().eq("id", inserted.id);
      ok.push("live insert probe: cleanup ok");
    }

    const { error: auditErr } = await admin.from("admin_audit_logs").insert({
      admin_user_id: ownerId,
      action: "verify_probe",
      target_user_id: targetId,
      metadata: { probe: true },
    });
    if (auditErr) {
      errors.push(`live audit insert probe failed: ${auditErr.message}`);
    } else {
      ok.push("live insert probe: admin_audit_logs row created");
      await admin.from("admin_audit_logs").delete().eq("action", "verify_probe");
    }
  }
} else {
  ok.push("live checks skipped (no Supabase service role in env)");
}

console.log("\n=== verify:admin-confirmations ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

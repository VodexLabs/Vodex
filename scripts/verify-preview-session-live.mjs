#!/usr/bin/env node
/**
 * Live check: preview_sessions insert with deployment_id / provider columns (service role).
 * Fast (~2s) — use instead of full E2E for schema verification.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("verify:preview-session-live FAILED — missing Supabase URL or service role key");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: sample, error: sampleErr } = await admin
  .from("projects")
  .select("id, owner_id")
  .limit(1)
  .maybeSingle();

if (sampleErr || !sample?.id || !sample?.owner_id) {
  console.error(
    "verify:preview-session-live FAILED — need at least one project row:",
    sampleErr?.message ?? "none",
  );
  process.exit(1);
}

const projectId = sample.id;
const ownerId = sample.owner_id;
const sessionId = crypto.randomUUID();
const now = new Date().toISOString();

const row = {
  id: sessionId,
  project_id: projectId,
  owner_id: ownerId,
  status: "ready",
  preview_url: "https://example.com/preview/test",
  snapshot_id: "live-verify",
  snapshot_files: [{ path: "app/page.tsx", content: "export default function P(){return null}" }],
  logs: [{ at: now, message: "live verify" }],
  error: null,
  provider_level: "in_app_sandbox",
  external_url: null,
  deployment_id: null,
  created_at: now,
  updated_at: now,
  expires_at: now,
};

const { error: insertErr } = await admin.from("preview_sessions").insert(row);
if (insertErr) {
  console.error("verify:preview-session-live FAILED insert:", insertErr.message);
  process.exit(1);
}

const { data, error: readErr } = await admin
  .from("preview_sessions")
  .select("id, deployment_id, external_url, provider_level")
  .eq("id", sessionId)
  .maybeSingle();

await admin.from("preview_sessions").delete().eq("id", sessionId);

if (readErr || !data) {
  console.error("verify:preview-session-live FAILED read:", readErr?.message ?? "no row");
  process.exit(1);
}

console.log("verify:preview-session-live OK", {
  deployment_id: data.deployment_id,
  external_url: data.external_url,
  provider_level: data.provider_level,
});

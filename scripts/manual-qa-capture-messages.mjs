#!/usr/bin/env node
/** Append assistant/user build messages from latest job to evidence file. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { resolveE2eUserEmail } from "./lib/e2e-live.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidencePath = path.join(root, ".manual-qa-partial-credits.json");
const env = {};
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i > 0) env[t.slice(0, i)] = t.slice(i + 1);
}

const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
const email = resolveE2eUserEmail({ ...process.env, ...env });
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
const userId = profile.id;

const { data: job } = await admin
  .from("build_jobs")
  .select("id, conversation_id, project_id, result_summary, status")
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

let messages = [];
if (job?.conversation_id) {
  const { data: rows } = await admin
    .from("messages")
    .select("role, content, credits_used, metadata, created_at")
    .eq("conversation_id", job.conversation_id)
    .order("created_at", { ascending: true });
  messages = (rows ?? []).map((r) => ({
    role: r.role,
    preview: (r.content ?? "").slice(0, 500),
    credits_used: r.credits_used,
    partial: r.metadata?.partial_needs_more_credits ?? false,
  }));
}

const { data: events } = await admin
  .from("build_job_events")
  .select("type, title, detail, progress_percent, created_at")
  .eq("job_id", job?.id ?? "")
  .order("created_at", { ascending: true });

evidence.latestJob = job;
evidence.chatMessages = messages;
evidence.allBuildEvents = events ?? [];
fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ job: job?.id, messageCount: messages.length, events: events?.length }, null, 2));

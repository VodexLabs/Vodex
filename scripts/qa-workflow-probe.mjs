#!/usr/bin/env node
/**
 * QA workflow probe — reads Supabase + local APIs (no secrets printed).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const PROJECT_ID = process.argv[2] ?? "3a776963-9904-447e-9f4b-98bf3380da57";

const TABLES = [
  "payment_provider_connections",
  "payment_webhook_events",
  "project_payment_products",
  "generated_app_revenue_events",
  "generated_app_subscriptions",
  "generated_app_entitlements",
  "payment_connector_audit_logs",
];

async function sb(pathSuffix, opts = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${pathSuffix}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json, ok: res.ok };
}

async function timeFetch(label, url, opts) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, opts);
    const ms = Date.now() - t0;
    const text = await res.text();
    return { label, ms, status: res.status, len: text.length, ok: res.ok };
  } catch (e) {
    return { label, ms: Date.now() - t0, error: e.message };
  }
}

const report = {
  node: process.version,
  baseUrl: BASE,
  supabaseRef: SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1] ?? "unknown",
  projectId: PROJECT_ID,
  migrations: {},
  project: null,
  files: null,
  buildJobs: null,
  timings: [],
};

for (const table of TABLES) {
  const r = await sb(`${table}?select=id&limit=1`, { method: "GET", headers: { Prefer: "count=exact" } });
  report.migrations[table] = r.status === 200 || r.status === 206 ? "exists" : `missing (${r.status})`;
}

const proj = await sb(
  `projects?id=eq.${PROJECT_ID}&select=id,name,app_name,status,published_subdomain,custom_domain,preview_url,metadata,icon_url,short_description`,
);
report.project = proj.json?.[0] ?? proj.json;

const files = await sb(
  `app_files?project_id=eq.${PROJECT_ID}&select=path&limit=500`,
);
report.files = {
  count: Array.isArray(files.json) ? files.json.length : 0,
  sample: Array.isArray(files.json) ? files.json.slice(0, 30).map((f) => f.path) : [],
};

const jobs = await sb(
  `build_jobs?project_id=eq.${PROJECT_ID}&select=id,status,created_at,updated_at&order=created_at.desc&limit=5`,
);
report.buildJobs = jobs.json;

const events = jobs.json?.[0]?.id
  ? await sb(
      `build_job_events?job_id=eq.${jobs.json[0].id}&select=event_type,progress_percent,title,detail,current_file,created_at&order=created_at.asc&limit=50`,
    )
  : null;
report.latestBuildEvents = events?.json ?? [];

report.timings.push(await timeFetch("ping", `${BASE}/api/dev/ping`));
report.timings.push(await timeFetch("home", `${BASE}/`));
report.timings.push(await timeFetch("analytics-revenue-unauth", `${BASE}/api/analytics/revenue`));

console.log(JSON.stringify(report, null, 2));

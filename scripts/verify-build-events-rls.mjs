#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mig = fs.readFileSync(
  path.join(root, "supabase/migrations/20260703120000_p05_build_events_model_decision_repair.sql"),
  "utf8",
);
const errors = [];
if (!mig.includes("enable row level security")) errors.push("RLS not enabled");
if (!mig.includes("for select")) errors.push("missing owner read policy");
if (!mig.includes("revoke insert")) errors.push("client insert not revoked");
if (!mig.includes("grant all on public.build_job_events to service_role")) errors.push("service_role grant missing");
if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}
console.log("✓ build_job_events RLS: owner read, service role write");

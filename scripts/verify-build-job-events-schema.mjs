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
if (!mig.includes("build_job_events")) errors.push("missing build_job_events migration");
if (!mig.includes("notify pgrst")) errors.push("missing pgrst reload");
if (!mig.includes("progress_percent")) errors.push("missing progress_percent column");
if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}
console.log("✓ build_job_events schema migration present");

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const events = fs.readFileSync(path.join(root, "src/lib/build/build-job-events.ts"), "utf8");
if (!events.includes("progressPercent") && !events.includes("progress_percent")) {
  console.error("✗ build-job-events must write progress_percent");
  process.exit(1);
}
const bad = fs
  .readFileSync(path.join(root, "scripts/qa-workflow-probe.mjs"), "utf8")
  .includes('from("build_jobs").select("progress_percent")');
if (bad) {
  console.error("✗ qa-workflow-probe must not query build_jobs.progress_percent");
  process.exit(1);
}
console.log("✓ build job progress uses events schema");

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "src/lib/build/build-job-events.ts"), "utf8");
const errors = [];
if (!src.includes("createServiceRoleClient")) errors.push("persist must use service role");
if (!src.includes("build_job_events")) errors.push("missing build_job_events insert");
if (!src.includes("isBuildEventsSchemaError")) errors.push("missing schema error handling");
if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}
console.log("✓ build events persist via service role");

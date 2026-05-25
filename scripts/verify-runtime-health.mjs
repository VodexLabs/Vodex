#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

function must(rel, needle, label) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  if (!src.includes(needle)) errors.push(`${rel} missing ${label}`);
  else ok.push(label);
}

must("src/lib/db/admin-runtime-health.ts", "criticalBlockers", "critical blockers split");
must("src/lib/db/admin-runtime-health.ts", "optionalIssues", "optional issues split");
must("src/lib/db/admin-runtime-health.ts", "appFilesColumns", "app_files column probe");
must("src/lib/runtime/runtime-schema-contract.ts", "OPTIONAL_ADMIN_TABLES", "optional admin tables");

console.log("\n=== verify:runtime-health ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

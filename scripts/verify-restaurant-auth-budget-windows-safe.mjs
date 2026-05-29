#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const watchdog = fs.readFileSync(path.join(root, "tests/e2e/helpers/stage-watchdog.ts"), "utf8");
const errs = [];

if (!watchdog.includes("win32") || !watchdog.includes("90_000")) {
  errs.push("stage-watchdog auth budget not raised for win32");
}
if (!watchdog.includes("create_interactive: process.platform === \"win32\" ? 45_000")) {
  errs.push("stage-watchdog create_interactive budget not raised for win32");
}
if (!watchdog.includes("GLOBAL_RESTAURANT_E2E_MAX_MS = 600_000")) {
  errs.push("missing 10 minute global cap");
}

if (errs.length) {
  console.error("verify:restaurant-auth-budget-windows-safe FAILED");
  for (const e of errs) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("verify:restaurant-auth-budget-windows-safe OK");

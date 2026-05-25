#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "src/lib/admin/execute-admin-action.ts"), "utf8");
const errors = [];
const ok = [];

for (const fn of ["admin_add_action_credits", "admin_set_action_credits_balance", "admin_reset_action_credits_monthly"]) {
  if (src.includes(fn)) ok.push(fn);
  else errors.push(`missing ${fn}`);
}

console.log("\n=== verify:action-credit-admin-actions ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

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

must("src/lib/admin/execute-admin-action.ts", "admin_add_tokens", "add build");
must("src/lib/admin/execute-admin-action.ts", "admin_set_token_balance", "set build");
must("src/lib/admin/execute-admin-action.ts", "createSupabaseAdmin", "service role rpc");

console.log("\n=== verify:admin-credit-actions ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

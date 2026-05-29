#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

function mustInclude(rel, needle, label) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  if (!src.includes(needle)) errors.push(`${rel} missing ${label}`);
  else ok.push(`${rel}: ${label}`);
}

mustInclude("src/components/admin/admin-users-panel.tsx", "Build credits", "admin build credits column");
mustInclude("src/components/admin/admin-users-panel.tsx", "Action credits", "admin action credits column");
mustInclude("src/components/admin/admin-users-panel.tsx", "add_action_credits", "admin add action credits");
mustInclude("src/lib/admin/list-users.ts", "adminFieldsFromCanonical", "admin uses canonical credits");
mustInclude("src/lib/admin/list-users.ts", "bonus_credits", "admin bonus credits field");
mustInclude("src/lib/admin/list-users.ts", "action_credits_remaining", "admin action credits field");
mustInclude("src/lib/admin/execute-admin-action.ts", "admin_add_action_credits", "execute add action credits");
mustInclude("src/lib/credits/canonical-credit-display.ts", "grantEvents", "grant events field support");

console.log("\n=== verify:admin-users-credits ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

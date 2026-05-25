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

must("src/components/layout/user-menu.tsx", 'reason: "popover-open"', "popover refresh");
must("src/lib/admin/execute-admin-action.ts", "serializeCanonicalCredits", "admin returns canonical");
must("src/app/api/admin/confirmations/verify/route.ts", "executed.credits", "verify returns credits");

console.log("\n=== verify:credit-ui-refresh ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

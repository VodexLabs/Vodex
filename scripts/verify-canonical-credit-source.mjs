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

function mustNot(rel, needle, label) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  if (src.includes(needle)) errors.push(`${rel} still has ${label}`);
  else ok.push(`no ${label}`);
}

must("src/lib/stores/credits-store.ts", "/api/credits", "store syncs from api");
must("src/components/layout/user-menu.tsx", "build.available", "profile popover uses build.available");
must("src/components/layout/user-menu.tsx", "action.available", "profile popover uses action.available");
must("src/components/layout/sidebar.tsx", "build.available", "sidebar uses build.available");
must("src/lib/admin/list-users.ts", "buildCanonicalBucket", "admin uses canonical bucket");
mustNot("src/components/layout/user-menu.tsx", "getMonthlyTokenQuotaForPlan", "profile popover plan guess");
mustNot("src/lib/credits/canonical-credit-display.ts", "sumGrantCredits", "removed grant inference");

console.log("\n=== verify:canonical-credit-source ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

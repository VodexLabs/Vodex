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

must("src/components/admin/admin-schema-health-banner.tsx", "Copy runtime repair SQL", "copy SQL button");
must("src/components/admin/admin-schema-health-banner.tsx", "Verify schema now", "verify button");
must("src/app/api/admin/credit-billing-sql-patch/route.ts", "getCreditBillingSqlPatch", "SQL patch API");
must("src/app/api/admin/schema-health/route.ts", "getAdminRuntimeHealth", "schema health API");

console.log("\n=== verify:admin-diagnostics ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

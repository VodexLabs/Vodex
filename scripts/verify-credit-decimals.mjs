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

must("src/lib/credits/credit-summary.ts", "formatCreditAmount", "decimal formatter");
must("supabase/migrations/20260624200000_decimal_user_credits.sql", "numeric(12, 1)", "decimal credits migration");
must("src/lib/credits/charge-ai-operation.ts", "MIN_CHARGEABLE_CREDITS", "decimal charge min");
must("src/lib/billing/credit-pricing.ts", "MIN_CHARGEABLE_CREDITS", "min chargeable config");

console.log("\n=== verify:credit-decimals ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

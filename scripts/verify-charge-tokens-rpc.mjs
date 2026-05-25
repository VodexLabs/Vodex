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

must("src/lib/db/charge-tokens-rpc.ts", "p_amount numeric", "numeric canonical signature");
must("src/lib/db/charge-tokens-rpc.ts", "LEGACY_CHARGE_TOKENS_INTEGER_PG_ARGS", "legacy integer compat");
must("supabase/migrations/20260628120000_charge_tokens_numeric_canonical.sql", "charge_tokens", "numeric migration");
must("scripts/dreamos-runtime-repair.sql", "p_amount numeric", "repair sql numeric");

console.log("\n=== verify:charge-tokens-rpc ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

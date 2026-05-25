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

must("src/lib/db/charge-probe-cache.ts", "probeChargeTokensRpcDetailed", "charge probe");
must("src/lib/runtime/runtime-schema-contract.ts", "charge_tokens", "contract");
must("scripts/dreamos-runtime-repair.sql", "charge_tokens", "repair SQL");
must("src/app/api/chat/route.ts", "charge_tokens_missing", "user-safe billing block");

console.log("\n=== verify:billing-schema-gate ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

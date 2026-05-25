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

must("src/app/api/credits/route.ts", "skipLedger: true", "fast path skips ledger");
must("src/app/api/credits/route.ts", "Promise.all", "parallel db reads");
must("src/lib/credits/canonical-credits.ts", "skipLedger", "ledger skip option");
must("src/app/api/credits/route.ts", "X-Credits-Timing-Ms", "timing header");

console.log("\n=== verify:credits-api-performance ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

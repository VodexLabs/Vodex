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

must("src/app/api/credits/route.ts", "loadCanonicalCredits", "api uses canonical loader");
must("src/app/api/credits/route.ts", "serializeCanonicalCredits", "api serializes build/action");
must("src/lib/credits/canonical-credits.ts", "build: payload.build", "build bucket in serializer");
must("src/lib/credits/canonical-credits.ts", "action: payload.action", "action bucket in serializer");
must("src/lib/credits/canonical-credits.ts", "bonusActive", "bonusActive field");
must("src/lib/credits/canonical-credits.ts", "canonical_balance", "source tag");

console.log("\n=== verify:credits-api-contract ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

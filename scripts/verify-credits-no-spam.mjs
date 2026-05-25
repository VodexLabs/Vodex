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

must("src/hooks/use-credits-sync.ts", "useCreditsSync", "central sync hook");
must("src/lib/stores/credits-store.ts", "inFlightRequest", "in-flight dedupe");
must("src/lib/stores/credits-store.ts", "CREDITS_STALE_MS", "stale guard");
mustNot("src/components/layout/user-menu.tsx", "subscribeCreditUpdated", "popover refetch loop");
mustNot("src/components/layout/sidebar.tsx", "subscribeCreditUpdated", "sidebar refetch loop");
mustNot("src/lib/stores/credits-store.ts", "5000", "5s poll debounce");

console.log("\n=== verify:credits-no-spam ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

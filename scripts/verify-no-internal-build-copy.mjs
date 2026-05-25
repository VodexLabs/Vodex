#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "src/components/build/app-blueprint-panel.tsx",
  "src/components/build/blueprint-confirmation-modal.tsx",
  "src/lib/build/blueprint-deterministic.ts",
  "src/components/create/workspace/build-status-narrator.tsx",
];
const forbidden = [
  "cheap model",
  "estimated cost",
  "mock data",
  "Supabase configuration",
  "costSavingStrategy",
  "Vercel",
];
const errors = [];
const ok = [];

for (const rel of files) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  for (const f of forbidden) {
    if (src.includes(f)) errors.push(`${rel} contains "${f}"`);
  }
}
if (errors.length === 0) ok.push("no internal build copy in user surfaces");

console.log("\n=== verify:no-internal-build-copy ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

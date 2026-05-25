#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = path.join(
  root,
  ".next/dev/server/app/(workspace)/create/page_client-reference-manifest.js",
);

if (!fs.existsSync(manifest)) {
  console.log("✓ Next dev manifest not present (clean state or no dev run yet).");
  process.exit(0);
}

try {
  const stat = fs.statSync(manifest);
  if (stat.size < 8) throw new Error("manifest too small");
  fs.readFileSync(manifest, "utf8");
  console.log("✓ page_client-reference-manifest.js looks readable.");
} catch (e) {
  console.error("✗ Corrupt or unreadable Next dev manifest detected.");
  console.error("  Run: npm run dev:clean");
  console.error(`  Path: ${manifest}`);
  if (e instanceof Error) console.error(`  ${e.message}`);
  process.exit(1);
}

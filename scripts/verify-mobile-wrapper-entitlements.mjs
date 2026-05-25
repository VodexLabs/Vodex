#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ent = fs.readFileSync(path.join(root, "src/lib/mobile/entitlements.ts"), "utf8");
const errors = [];
const ok = [];

const keys = [
  "mobile_wrapper_view",
  "mobile_android_build",
  "mobile_ios_build",
  "mobile_store_publish_helper",
  "mobile_push_notifications",
];
for (const k of keys) {
  if (!ent.includes(k)) errors.push(`entitlement ${k}`);
  else ok.push(k);
}

console.log("\n=== verify:mobile-wrapper-entitlements ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

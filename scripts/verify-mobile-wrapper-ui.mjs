#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

function mustExist(rel, label) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) errors.push(`missing ${label}: ${rel}`);
  else ok.push(label);
}

function mustInclude(rel, needle, label) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  if (!src.includes(needle)) errors.push(`${rel} missing ${label}`);
  else ok.push(label);
}

mustExist("src/components/mobile/mobile-wrapper-studio.tsx", "MobileWrapperStudio");
mustExist("supabase/migrations/20260629120000_mobile_wrapper_system.sql", "mobile migration");
mustInclude("src/components/create/workspace/immersive-workspace.tsx", "MobileWrapperStudio", "builder mobile tab");
mustInclude("src/components/create/workspace/immersive-workspace.tsx", '"mobile"', "mobile tab id");
mustInclude("src/components/mobile/mobile-wrapper-studio.tsx", "Ask DreamOS86 to help", "help button");
mustInclude("src/lib/mobile/entitlements.ts", "mobile_android_build", "entitlements");

console.log("\n=== verify:mobile-wrapper-ui ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = fs.readFileSync(path.join(root, "src/components/create/create-workspace-entry.tsx"), "utf8");

const replaceCount = (entry.match(/router\.replace/g) ?? []).length;
if (replaceCount > 3) {
  console.error(`✗ create-workspace-entry has ${replaceCount} router.replace calls — risk of loops`);
  process.exit(1);
}
if (entry.includes("router.refresh")) {
  console.error("✗ create-workspace-entry must not call router.refresh");
  process.exit(1);
}
console.log("✓ create page has no route refresh loop in entry");

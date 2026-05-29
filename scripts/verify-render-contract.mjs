#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = path.join(root, "src/lib/build/build-success-contract.ts");
const src = fs.readFileSync(p, "utf8");
if (!src.includes("MIN_RENDERABLE_FILES") || !src.includes("previewReady")) {
  console.error("✗ build-success-contract render gates missing");
  process.exit(1);
}
console.log("✓ render contract gates present");

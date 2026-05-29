#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = path.join(root, "src/lib/build/import-graph.ts");
if (!fs.existsSync(p)) {
  console.error("✗ import-graph.ts missing");
  process.exit(1);
}
const src = fs.readFileSync(p, "utf8");
for (const fn of ["findMissingRelativeImports", "countComponentFiles"]) {
  if (!src.includes(`export function ${fn}`) && !src.includes(`export function ${fn}(`)) {
    console.error(`✗ missing ${fn}`);
    process.exit(1);
  }
}
console.log("✓ import graph validation module present");

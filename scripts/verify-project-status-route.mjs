#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(path.join(root, "src/app/api/projects/[id]/status/route.ts"), "utf8");
const errors = [];
if (!route.includes("export async function GET")) errors.push("missing GET handler");
if (!route.includes("buildJob")) errors.push("missing buildJob payload");
if (!route.includes("contract")) errors.push("missing contract payload");
if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}
console.log("✓ project status GET route implemented");

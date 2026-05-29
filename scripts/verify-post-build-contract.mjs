#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function mustInclude(rel, needle) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    errors.push(`missing file: ${rel}`);
    return;
  }
  const src = fs.readFileSync(p, "utf8");
  if (!src.includes(needle)) errors.push(`${rel} must include: ${needle}`);
}

mustInclude("src/lib/build/post-build-contract.ts", "enforcePostBuildContractWithRepair");
mustInclude("src/lib/build/build-pipeline.ts", "enforcePostBuildContractWithRepair");
mustInclude("src/lib/build/execute-staged-build-job.ts", "clearGeneratedBuildFiles");
mustInclude("src/lib/build/post-build-contract.ts", "STANDARD_MIN_ROUTE_PAGES = 5");
mustInclude("src/lib/build/post-build-contract.ts", "PREVIEW_READY_MIN_SCORE");

if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}
console.log("✓ post-build contract wired");

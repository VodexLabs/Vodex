#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pipeline = fs.readFileSync(path.join(root, "src/lib/build/build-pipeline.ts"), "utf8");
const exec = fs.readFileSync(path.join(root, "src/lib/build/execute-staged-build-job.ts"), "utf8");
const ok =
  pipeline.includes('mode: "build"') &&
  pipeline.includes("modelId: primaryModelId") &&
  exec.includes("normalizeBuildError");
console.log(ok ? "✓ build job required log fields" : "✗ missing fields");
process.exit(ok ? 0 : 1);

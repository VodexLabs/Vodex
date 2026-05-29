#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const job = fs.readFileSync(path.join(root, "src/lib/build/execute-staged-build-job.ts"), "utf8");
if (!job.includes("!previewResult.ok")) {
  console.error("verify:no-preview-ready-with-zero-files FAILED: missing preview failure branch");
  process.exit(1);
}
console.log("verify:no-preview-ready-with-zero-files OK");

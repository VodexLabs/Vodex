#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const preview = fs.readFileSync(path.join(root, "src/lib/preview/preview-build-service.ts"), "utf8");
const job = fs.readFileSync(path.join(root, "src/lib/build/execute-staged-build-job.ts"), "utf8");
const errors = [];

if (!preview.includes("capturePublishedSnapshot")) errors.push("preview must load from app_files snapshot");
if (!job.includes("startPreviewSession")) errors.push("build completion must start preview session");

if (errors.length) {
  console.error("verify:preview-uses-persisted-files FAILED");
  errors.forEach((e) => console.error(" ✗", e));
  process.exit(1);
}
console.log("verify:preview-uses-persisted-files OK");

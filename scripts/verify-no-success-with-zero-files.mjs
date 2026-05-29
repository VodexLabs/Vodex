#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const job = fs.readFileSync(path.join(root, "src/lib/build/execute-staged-build-job.ts"), "utf8");
const errors = [];

if (!job.includes("fileGate.ok")) errors.push("execute-staged-build-job must gate on fileGate.ok");
if (!job.includes("startPreviewSession")) errors.push("must start preview before completed event");
if (job.includes('type: "completed"') && !job.includes("files_persisted")) {
  errors.push("completed event should record files_persisted");
}

if (errors.length) {
  console.error("verify:no-success-with-zero-files FAILED");
  errors.forEach((e) => console.error(" ✗", e));
  process.exit(1);
}
console.log("verify:no-success-with-zero-files OK");

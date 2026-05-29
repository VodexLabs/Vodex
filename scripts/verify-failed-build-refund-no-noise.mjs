#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const job = fs.readFileSync(path.join(root, "src/lib/build/execute-staged-build-job.ts"), "utf8");
if (!job.includes(".catch(() => undefined)")) {
  console.error("verify:failed-build-refund-no-noise FAILED: refund must not throw");
  process.exit(1);
}
console.log("verify:failed-build-refund-no-noise OK");

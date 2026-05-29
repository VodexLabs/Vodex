#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = fs.readFileSync(path.join(root, "scripts/e2e-credits-prepare.mjs"), "utf8");
const errors = [];
if (!script.includes("VERCEL_ENV") || !script.includes("production")) {
  errors.push("must block production via VERCEL_ENV");
}
if (!script.includes("allowE2eCreditPrepare")) errors.push("must use allowE2eCreditPrepare guard");
if (!script.includes("E2E_RUN_LIVE")) errors.push("must allow E2E_RUN_LIVE=1 override");

if (errors.length) {
  console.error("verify:e2e-credits-no-production-leak FAILED");
  errors.forEach((e) => console.error(" ✗", e));
  process.exit(1);
}
console.log("verify:e2e-credits-no-production-leak OK");

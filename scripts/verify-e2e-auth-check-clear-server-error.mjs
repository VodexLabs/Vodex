#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = fs.readFileSync(path.join(root, "scripts/e2e-auth-check.mjs"), "utf8");
const verify = fs.readFileSync(path.join(root, "scripts/verify-e2e-auth.mjs"), "utf8");
const msg = "Dev server is not running. Start npm run dev or use npm run e2e:restaurant:stable.";
if (!check.includes(msg) || !verify.includes(msg)) {
  console.error("verify:e2e-auth-check-clear-server-error FAILED");
  process.exit(1);
}
console.log("verify:e2e-auth-check-clear-server-error OK");

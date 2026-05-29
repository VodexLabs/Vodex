#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const script = fs.readFileSync(path.join(root, "scripts/e2e-credits-prepare.mjs"), "utf8");
const stable = fs.readFileSync(path.join(root, "scripts/e2e-restaurant-stable.mjs"), "utf8");

for (const token of [
  "SUPABASE_SERVICE_ROLE_KEY",
  "E2E_TEST_EMAIL",
  "E2E_MIN_BUILD_CREDITS",
  "allowE2eCreditPrepare",
  "e2e_marker",
]) {
  if (!script.includes(token)) errors.push(`e2e-credits-prepare missing ${token}`);
}
if (!stable.includes("e2e:credits:prepare")) errors.push("stable runner must call e2e:credits:prepare");
if (!stable.includes("assertE2eCreditsSufficient")) errors.push("stable runner must verify credits API");

if (errors.length) {
  console.error("verify:e2e-credit-prepare FAILED");
  errors.forEach((e) => console.error(" ✗", e));
  process.exit(1);
}
console.log("verify:e2e-credit-prepare OK");

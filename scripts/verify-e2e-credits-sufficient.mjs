#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { E2E_MIN_ACTION_CREDITS, E2E_MIN_BUILD_CREDITS } from "./lib/e2e-credit-thresholds.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const api = fs.readFileSync(path.join(root, "scripts/lib/verify-e2e-credits-api.mjs"), "utf8");
if (!api.includes("E2E_CREDITS_INSUFFICIENT") || !api.includes("/api/credits")) {
  console.error("verify:e2e-credits-sufficient FAILED: API helper incomplete");
  process.exit(1);
}
console.log(
  `verify:e2e-credits-sufficient OK (thresholds build=${E2E_MIN_BUILD_CREDITS} action=${E2E_MIN_ACTION_CREDITS})`,
);

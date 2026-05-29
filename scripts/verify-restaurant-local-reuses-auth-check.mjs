#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errs = [];

const runner = fs.readFileSync(path.join(root, "scripts/lib/e2e-restaurant-runner.mjs"), "utf8");
const local = fs.readFileSync(path.join(root, "scripts/e2e-restaurant-local.mjs"), "utf8");
const spec = fs.readFileSync(path.join(root, "tests/e2e/restaurant-inventory-workflow.spec.ts"), "utf8");
const probe = fs.readFileSync(path.join(root, "tests/e2e/helpers/e2e-auth-probe.ts"), "utf8");

if (!runner.includes("E2E_AUTH_CHECK_PASSED")) errs.push("runner missing E2E_AUTH_CHECK_PASSED");
if (!runner.includes('E2E_SKIP_BROWSER_AUTH_PROBE: "1"')) errs.push("local runner missing skip browser auth probe");
if (!local.includes("E2E_SKIP_RESTAURANT_PREFLIGHT")) errs.push("local script missing skip preflight default");
if (!spec.includes("assertE2eAuthFromPreparedSession")) errs.push("spec missing fast auth reuse");
if (!spec.includes("reuse_auth_check")) errs.push("spec missing auth timing mode");
if (!probe.includes("assertE2eAuthFromPreparedSession")) errs.push("probe missing fast auth helper");
if (!probe.includes("shouldReusePreparedAuth") || !probe.includes("cachedE2eAuthUserId")) {
  errs.push("resolveAuthUserId must reuse prepared session without browser probe");
}
if (!runner.includes("E2E_SKIP_INLINE_QUEUE") || !local.includes("E2E_SKIP_RESTAURANT_PREFLIGHT")) {
  errs.push("local runner missing queue-only reuse via E2E_SKIP_INLINE_QUEUE");
}
if (!spec.includes("auth_user_unresolved") && !probe.includes("auth_user_unresolved")) {
  errs.push("missing auth_user_unresolved fast-fail");
}

if (errs.length) {
  console.error("verify:restaurant-local-reuses-auth-check FAILED");
  for (const e of errs) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("verify:restaurant-local-reuses-auth-check OK");

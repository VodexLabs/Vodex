#!/usr/bin/env node
/**
 * P0.15 static verification — E2E runner + auth probe.
 * Usage: node scripts/verify-p15-e2e.mjs <check>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const pkg = read("package.json");

const checks = {
  "e2e-stable-server-readiness": () => {
    const errs = [];
    const mod = read("scripts/lib/e2e-dev-server-readiness.mjs");
    if (!mod.includes("PING_READINESS_TIMEOUT_MS = 180_000")) errs.push("180s ping timeout");
    if (!mod.includes("PING_PROGRESS_MS = 5_000")) errs.push("5s progress interval");
    if (!mod.includes("POST_PING_SETTLE_MS")) errs.push("post-ping settle");
    if (!mod.includes("/api/dev/auth-session-check")) errs.push("auth-session-check warm");
    const runner = read("scripts/lib/e2e-restaurant-runner.mjs");
    if (!runner.includes("ensureE2eDevServerReady")) errs.push("runner must use ensureE2eDevServerReady");
    return errs;
  },
  "e2e-auth-resolved-in-browser-context": () => {
    const errs = [];
    const probe = read("tests/e2e/helpers/e2e-auth-probe.ts");
    if (!probe.includes("userResolved")) errs.push("must check userResolved");
    if (!probe.includes("onboardingCompleted")) errs.push("must check onboarding");
    if (!probe.includes("assertE2eAuthInBrowserContext")) errs.push("missing assert helper");
    const spec = read("tests/e2e/e2e-auth-probe.spec.ts");
    if (!spec.includes("@live")) errs.push("auth probe spec missing");
    const restaurant = read("tests/e2e/restaurant-inventory-workflow.spec.ts");
    if (!restaurant.includes("assertE2eAuthInBrowserContext")) errs.push("restaurant must probe auth first");
    return errs;
  },
  "e2e-auth-stale-storage-detected": () => {
    const probe = read("tests/e2e/helpers/e2e-auth-probe.ts");
    if (!probe.includes("E2E_AUTH_STALE")) return ["must detect stale storage"];
    if (!probe.includes("e2e:auth:setup")) return ["must mention e2e:auth:setup"];
    return [];
  },
  "e2e-restaurant-local-script": () => {
    const errs = [];
    if (!pkg.includes('"e2e:restaurant:local"')) errs.push("package.json missing e2e:restaurant:local");
    const local = read("scripts/e2e-restaurant-local.mjs");
    if (!local.includes('mode: "local"')) errs.push("local script must use local mode");
    if (!local.includes("reusing")) errs.push("local script should document no kill");
    const runner = read("scripts/lib/e2e-restaurant-runner.mjs");
    if (runner.includes("killPortProcessSafely") && !runner.includes('mode === "stable"'))
      errs.push("kill must be stable-only");
    return errs;
  },
};

const name = process.argv[2];
if (!name || !checks[name]) {
  console.error(`Usage: node scripts/verify-p15-e2e.mjs <${Object.keys(checks).join("|")}>`);
  process.exit(1);
}
const errs = checks[name]();
if (errs.length) {
  console.error(`verify:${name} FAILED`);
  errs.forEach((e) => console.error(" ✗", e));
  process.exit(1);
}
console.log(`verify:${name} OK`);

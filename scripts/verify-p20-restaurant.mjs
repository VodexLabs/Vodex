#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

const checks = {
  "restaurant-e2e-10min-hard-cap": () => {
    mustInclude(root, "tests/e2e/helpers/stage-watchdog.ts", [
      "GLOBAL_RESTAURANT_E2E_MAX_MS = 600_000",
      "assertGlobalCap",
      "final-restaurant-e2e-failure.json",
    ], errors);
    mustInclude(root, "tests/e2e/restaurant-inventory-workflow.spec.ts", [
      "GLOBAL_RESTAURANT_E2E_MAX_MS",
      "timeout: 600_000",
    ], errors);
    const spec = fs.readFileSync(
      path.join(root, "tests/e2e/restaurant-inventory-workflow.spec.ts"),
      "utf8",
    );
    if (/1_800_000|1800000/.test(spec)) {
      errors.push("restaurant E2E still references 30min timeout");
    }
    const runner = fs.readFileSync(
      path.join(root, "scripts/lib/e2e-restaurant-runner.mjs"),
      "utf8",
    );
    if (!/--timeout=600000/.test(runner)) {
      errors.push("e2e-restaurant-runner must pass --timeout=600000 to playwright");
    }
    if (/1800000/.test(runner)) {
      errors.push("e2e-restaurant-runner still uses 30min playwright timeout");
    }
  },
  "restaurant-e2e-stage-watchdogs": () => {
    mustInclude(root, "tests/e2e/helpers/stage-watchdog.ts", [
      "STAGE_BUDGET_MS",
      "preview: 60_000",
      "build_events: 180_000",
      "tick(",
    ], errors);
    mustInclude(root, "tests/e2e/restaurant-inventory-workflow.spec.ts", [
      "StageWatchdog",
      "watchdog.tick",
      "shouldAbort",
    ], errors);
    const spec = fs.readFileSync(
      path.join(root, "tests/e2e/restaurant-inventory-workflow.spec.ts"),
      "utf8",
    );
    if (!/BUILD_DEADLINE_MS = 180_000/.test(spec)) {
      errors.push("BUILD_DEADLINE_MS should be 180_000 to match files-persisted budget");
    }
  },
  "preview-helper-no-disposed-context": () => {
    mustInclude(root, "tests/e2e/helpers/preview-render-check.ts", [
      "safeApiGet",
      "isPageOpen",
      "preview_context_closed",
      "request_context_available",
      "preview_context_closed",
    ], errors);
    const raw = fs.readFileSync(
      path.join(root, "tests/e2e/helpers/preview-render-check.ts"),
      "utf8",
    );
    const assertIdx = raw.indexOf("export async function assertPreviewRendered");
    const assertBody = assertIdx >= 0 ? raw.slice(assertIdx) : raw;
    if (/await request\.get\(/.test(assertBody)) {
      errors.push("assertPreviewRendered must not call request.get directly (use safeApiGet)");
    }
    if (!/async function safeApiGet/.test(raw)) {
      errors.push("preview-render-check missing safeApiGet wrapper");
    }
  },
  "preview-fails-fast-with-evidence": () => {
    mustInclude(root, "tests/e2e/helpers/preview-render-check.ts", [
      "preview-render-failure.json",
      "preview_stage_timeout",
      "low_stock_alerts",
      "last_stage_elapsed_ms",
      "STAGE_BUDGET_MS.preview",
    ], errors);
    mustInclude(root, "tests/e2e/restaurant-inventory-workflow.spec.ts", [
      'watchdog.enter("preview")',
      "preview-render-failure.json",
    ], errors);
  },
  "restaurant-local-uses-new-watchdogs": () => {
    const runner = fs.readFileSync(
      path.join(root, "scripts/lib/e2e-restaurant-runner.mjs"),
      "utf8",
    );
    mustInclude(root, "scripts/lib/e2e-restaurant-runner.mjs", [
      "clearStaleRestaurantE2eEvidence",
      "e2e:restaurant:enqueue-smoke",
      "--timeout=600000",
    ], errors);
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    if (!pkg.scripts["e2e:restaurant:local"]) {
      errors.push("missing e2e:restaurant:local script");
    }
    if (runner.includes("1800000")) {
      errors.push("local runner must not use 30min timeout");
    }
  },
  "no-stale-restaurant-evidence-merge": () => {
    mustInclude(root, "tests/e2e/helpers/restaurant-evidence-cleanup.ts", [
      "restaurant-qa-report.json",
      "preview-render-failure.json",
      "final-restaurant-e2e-failure.json",
    ], errors);
    mustInclude(root, "tests/e2e/restaurant-inventory-workflow.spec.ts", [
      "clearStaleRestaurantE2eEvidence",
    ], errors);
    const spec = fs.readFileSync(
      path.join(root, "tests/e2e/restaurant-inventory-workflow.spec.ts"),
      "utf8",
    );
    if (!/opts\?\.merge/.test(spec)) {
      errors.push("writeQaReport should gate merge behind opts.merge");
    }
    if (/if \(!opts\?\.fresh && fs\.existsSync/.test(spec)) {
      errors.push("writeQaReport still merges stale QA by default");
    }
  },
};

const target = process.argv[2];
if (!target || !checks[target]) {
  console.error(`Usage: node scripts/verify-p20-restaurant.mjs <${Object.keys(checks).join("|")}>`);
  process.exit(1);
}
checks[target]();
finish(`verify:${target}`, errors);

#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustInclude, finish } from "./lib/verify-static.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

const checks = {
  "restaurant-e2e-build-now-strategy": () => {
    mustInclude(root, "src/components/create/workspace/immersive-workspace.tsx", [
      'data-build-strategy={composerBuildStrategy}',
      'data-plan-first-enabled={planFirstEnabled ? "true" : "false"}',
      'data-can-enqueue-build={canEnqueueBuild ? "true" : "false"}',
    ], errors);
    mustInclude(root, "tests/e2e/helpers/build-strategy-assert.ts", [
      "build-strategy-failure.json",
      "build_now",
    ], errors);
    mustInclude(root, "tests/e2e/restaurant-inventory-workflow.spec.ts", [
      "assertRestaurantBuildNowBeforeSubmit",
    ], errors);
  },
  "plan-first-not-used-for-restaurant-e2e": () => {
    mustInclude(root, "tests/e2e/helpers/create-submit-assert.ts", ["ensureBuildNowStrategy"], errors);
    mustInclude(root, "tests/e2e/restaurant-build-enqueue-smoke.spec.ts", [
      "strategy=build_now",
      "assertRestaurantBuildNowBeforeSubmit",
    ], errors);
  },
  "restaurant-chat-build-now-payload": () => {
    mustInclude(root, "src/lib/create/async-build-client.ts", [
      "forceBuildPipeline",
      'strategy: input.body.strategy',
    ], errors);
    mustInclude(root, "src/components/create/workspace/immersive-workspace.tsx", [
      "forceBuildPipeline: true",
      'strategy: "build_now"',
    ], errors);
  },
  "api-chat-build-now-returns-202": () => {
    mustInclude(root, "src/app/api/chat/route.ts", [
      "forceBuildPipeline",
      'explicitStrategy === "build_now"',
      "status: 202",
      "buildJobId",
      "eventsUrl",
    ], errors);
  },
  "build-now-never-routes-to-plan-first": () => {
    mustInclude(root, "src/app/api/chat/route.ts", [
      "if (forceBuildPipeline && explicitStrategy === \"build_now\"",
      "planFirstOnly = false",
    ], errors);
    const raw = fs.readFileSync(path.join(root, "src/app/api/chat/route.ts"), "utf8");
    if (!raw.includes("explicitStrategy === \"build_now\" && forceBuildPipeline")) {
      errors.push("chat route missing build_now override guard");
    }
  },
  "restaurant-enqueue-smoke-script": () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    if (!pkg.scripts["e2e:restaurant:enqueue-smoke"]) {
      errors.push("missing npm script e2e:restaurant:enqueue-smoke");
    }
    mustInclude(root, "tests/e2e/restaurant-build-enqueue-smoke.spec.ts", [
      "waitFor202",
      "first_build_event",
    ], errors);
  },
  "restaurant-e2e-stage-watchdogs": () => {
    mustInclude(root, "tests/e2e/helpers/stage-watchdog.ts", [
      "STAGE_BUDGET_MS",
      "stage-watchdog-failure.json",
      "chat_enqueue: 45_000",
    ], errors);
    mustInclude(root, "tests/e2e/restaurant-inventory-workflow.spec.ts", ["StageWatchdog"], errors);
  },
  "no-restaurant-e2e-30min-timeout": () => {
    const spec = fs.readFileSync(
      path.join(root, "tests/e2e/restaurant-inventory-workflow.spec.ts"),
      "utf8",
    );
    if (/1_800_000|1800000/.test(spec)) {
      errors.push("restaurant E2E still uses 30min timeout");
    }
    if (!/600_000|600000/.test(spec)) {
      errors.push("restaurant E2E should use 10min (600000ms) timeout");
    }
    const runner = fs.readFileSync(
      path.join(root, "scripts/lib/e2e-restaurant-runner.mjs"),
      "utf8",
    );
    if (/1800000/.test(runner)) {
      errors.push("e2e-restaurant-runner still uses 30min playwright timeout");
    }
  },
};

const target = process.argv[2];
if (!target || !checks[target]) {
  console.error(`Usage: node scripts/verify-p19-restaurant.mjs <${Object.keys(checks).join("|")}>`);
  process.exit(1);
}
checks[target]();
finish(`verify:${target}`, errors);

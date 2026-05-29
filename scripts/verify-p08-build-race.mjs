#!/usr/bin/env node
/**
 * P0.8 static verification — source contracts for build race / files / E2E polling.
 * Usage: node scripts/verify-p08-build-race.mjs [check-name]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const execute = read("src/lib/build/execute-staged-build-job.ts");
const terminal = read("src/lib/build/build-job-terminal.ts");
const persist = read("src/lib/build/persist-generated-files.ts");
const events = read("src/lib/build/build-job-events.ts");
const migration = read("supabase/migrations/20260706120000_p08_build_job_terminal_state.sql");
const poll = read("tests/e2e/helpers/restaurant-qa.ts");
const snapshot = read("tests/e2e/helpers/build-failure-snapshot.ts");

const checks = {
  "build-job-exactly-once": () => {
    if (!execute.includes("claimBuildJobWorker")) throw new Error("missing claimBuildJobWorker");
    if (!execute.includes("createBuildWorkerContext")) throw new Error("missing worker context");
    if (!execute.includes("executionInstanceId")) throw new Error("missing executionInstanceId");
    if (!execute.includes("jobClaimed")) throw new Error("missing jobClaimed guard on catch");
    if (!execute.includes("if (!claim.claimed)")) throw new Error("missing early return on claim fail");
    if (!migration.includes("execution_instance_id is null")) throw new Error("weak claim in migration");
  },
  "build-job-terminal-state-no-overwrite": () => {
    if (!migration.includes("transition_build_job_status")) throw new Error("missing transition RPC");
    if (!migration.includes("completed") || !migration.includes("failed")) {
      throw new Error("terminal overwrite guards missing");
    }
    if (!execute.includes("transitionBuildJobStatus")) throw new Error("execute must use transition RPC");
    if (!execute.includes("skipJobStatusUpdate: true")) throw new Error("finalize must skip direct job status");
  },
  "duplicate-worker-no-mutation": () => {
    if (!execute.includes("inFlightBuildJobs")) throw new Error("missing inFlightBuildJobs");
    if (!execute.includes("duplicate worker skipped")) throw new Error("missing duplicate log");
    if (!execute.match(/if \(!claim\.claimed\)[\s\S]*return/)) {
      throw new Error("unclaimed worker must return without mutation");
    }
  },
  "no-premature-build-failed-status": () => {
    if (!events.includes('failed: "fixing_error"')) throw new Error("workflow failed must map to fixing_error");
    if (!events.includes('if (ev.type === "failed") return')) {
      throw new Error("workflow failed must not persist terminal event");
    }
  },
  "repair-events-not-terminal": () => {
    if (!events.includes("fixing_error")) throw new Error("missing fixing_error event type");
    if (!poll.includes("repairTokens")) throw new Error("E2E must treat repair tokens as non-terminal");
  },
  "build-events-terminal-source-of-truth": () => {
    if (!poll.includes('jobFromEvents === "completed"')) throw new Error("poll must use job status");
    if (!poll.includes("failedStableSince")) throw new Error("poll must stabilize failed status");
  },
  "app-files-persist-trace": () => {
    if (!execute.includes("tracePersistGeneratedFiles")) throw new Error("missing trace persist");
    if (!fs.existsSync(path.join(root, "src/lib/build/files-persist-trace.ts"))) {
      throw new Error("missing files-persist-trace.ts");
    }
  },
  "no-stale-worker-clears-files": () => {
    if (!persist.includes("stale_worker")) throw new Error("clear must block stale worker");
    if (!persist.includes("job_already_completed")) throw new Error("clear must block when completed");
  },
  "files-api-sees-persisted-files": () => {
    if (!poll.includes("filesApiCount")) throw new Error("poll must check /files API");
    if (!execute.includes("assertBuildFilesPersisted")) throw new Error("missing assertBuildFilesPersisted");
  },
  "clear-files-ownership-guard": () => {
    if (!execute.includes("executionInstanceId: workerCtx.executionInstanceId")) {
      throw new Error("clear must pass executionInstanceId");
    }
  },
  "restaurant-e2e-polling-terminal-logic": () => {
    if (!poll.includes("raceDetected")) throw new Error("poll must detect race");
    if (!poll.includes("30_000")) throw new Error("poll must handle event stall");
  },
  "e2e-failure-snapshot-written": () => {
    if (!snapshot.includes("build-failure-snapshot.json")) throw new Error("missing snapshot path");
    if (!fs.readFileSync(path.join(root, "tests/e2e/restaurant-inventory-workflow.spec.ts"), "utf8").includes(
      "writeBuildFailureSnapshot",
    )) {
      throw new Error("restaurant spec must write snapshot on failure");
    }
  },
};

const name = process.argv[2];
if (!name || !checks[name]) {
  console.error(`Usage: node scripts/verify-p08-build-race.mjs <${Object.keys(checks).join("|")}>`);
  process.exit(1);
}

try {
  checks[name]();
  console.log(`✓ ${name}`);
} catch (e) {
  console.error(`✗ ${name}:`, e.message);
  process.exit(1);
}

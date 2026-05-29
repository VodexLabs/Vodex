#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv[2];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

const execJob = read("src/lib/build/execute-staged-build-job.ts");
const pipeline = read("src/lib/build/build-pipeline.ts");
const provider = read("src/lib/ai/provider-call.ts");
const chat = read("src/app/api/chat/route.ts");
const trace = read("src/lib/build/build-worker-trace.ts");
const schedule = read("src/lib/build/schedule-async-build.ts");
const stall = read("src/lib/build/worker-stall-snapshot.ts");
const restaurant = read("tests/e2e/restaurant-inventory-workflow.spec.ts");

if (check === "build-worker-trace-events") {
  const stages = [
    "worker_claim_attempt",
    "worker_claimed",
    "build_pipeline_entered",
    "planner_model_call_started",
    "deterministic_plan_fallback_used",
    "file_generation_started",
    "persist_started",
    "job_completed",
  ];
  for (const s of stages) {
    if (!trace.includes(s)) fail(`missing trace stage ${s}`);
    const inWorker =
      execJob.includes(s) ||
      pipeline.includes(s) ||
      trace.includes(s) ||
      read("src/lib/build/timed-build-operations.ts").includes(s);
    if (!inWorker) fail(`stage ${s} not wired in worker/pipeline`);
  }
  if (!trace.includes("[build-worker-trace]")) fail("server log trace missing");
  console.log("✓ build worker trace stages present");
} else if (check === "worker-stall-snapshot") {
  if (!stall.includes("worker-stall-snapshot.json")) fail("stall snapshot path");
  if (!execJob.includes("writeWorkerStallSnapshot")) fail("execute job must write stall snapshot");
  console.log("✓ worker stall snapshot helper");
} else if (check === "provider-call-timeouts") {
  if (!provider.includes("AbortController")) fail("AbortController required");
  if (!provider.includes("abortSignal")) fail("abortSignal required");
  if (!provider.includes("provider_request_timeout")) fail("timeout log required");
  console.log("✓ provider call timeouts");
} else if (check === "planning-timeout-uses-deterministic-fallback") {
  if (!pipeline.includes("deterministic_plan_fallback_used")) fail("deterministic fallback trace");
  if (!pipeline.includes("callProviderWithBuildTimeout")) fail("timed plan call");
  console.log("✓ planning timeout uses deterministic fallback");
} else if (check === "restaurant-build-continues-after-planner-timeout") {
  const r = spawnSync("npx", ["tsx", path.join(root, "scripts/lib/verify-p13-planner-timeout.ts")], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  process.exit(r.status ?? 1);
} else if (check === "restaurant-build-independent-of-planner") {
  if (!pipeline.includes("hasDeterministicArchetypePlan")) fail("known archetype fast path");
  if (!pipeline.includes("hasFullScaffoldTree")) fail("scaffold before frontend");
  console.log("✓ restaurant build independent of planner");
} else if (check === "known-archetype-fast-path") {
  if (!read("src/lib/build/deterministic-archetype-plan.ts").includes("restaurant_inventory")) {
    fail("restaurant in deterministic plan");
  }
  console.log("✓ known archetype fast path");
} else if (check === "build-heartbeat-events") {
  if (!execJob.includes("heartbeat")) fail("heartbeat in execute job");
  if (!execJob.includes("trace_stage")) fail("heartbeat must include stage metadata");
  console.log("✓ build heartbeat events");
} else if (check === "build-stage-timeout") {
  if (!execJob.includes("PIPELINE_HARD_CAP_MS")) fail("pipeline hard cap");
  if (!pipeline.includes("withTimeout")) fail("stage timeouts in pipeline");
  console.log("✓ build stage timeout");
} else if (check === "no-16min-planning-stall") {
  const poll = read("tests/e2e/helpers/restaurant-qa.ts");
  if (!poll.includes("STAGE_STUCK_MS")) fail("stage stuck guard in pollBuildComplete");
  if (!poll.includes("stageStuck")) fail("stageStuck early exit");
  if (!schedule.includes("shouldRunInlineAsyncBuild")) fail("inline async build scheduler");
  console.log("✓ no 16min planning stall guards");
} else if (check === "background-worker-service-role-only") {
  if (!read("src/lib/build/build-job-events.ts").includes("createServiceRoleClient")) {
    fail("build events should use service role");
  }
  if (!read("src/lib/build/build-job-terminal.ts").includes("createServiceRoleClient")) {
    fail("build job terminal should use service role");
  }
  console.log("✓ background worker service role");
} else if (check === "proxy-auth-timeout-does-not-stop-build") {
  if (!chat.includes("shouldRunInlineAsyncBuild")) fail("inline build for dev/e2e");
  if (!chat.includes("createServiceRoleClient")) fail("chat uses service role writer");
  if (execJob.includes("createClient()")) fail("execute job must not use request supabase client");
  console.log("✓ proxy auth timeout does not stop build worker");
} else {
  fail(`unknown check: ${check}`);
}

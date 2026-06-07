#!/usr/bin/env node
/**
 * P1.3.11 — canonical build terminal truth resolver wired across UI + pipeline.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
    return false;
  }
  console.log("OK:", msg);
  return true;
}

const truth = read("src/lib/build/build-terminal-truth.ts");
assert(truth.includes("resolveBuildTerminalTruth"), "resolver exists");
assert(truth.includes("hasRecoverableBuildFiles"), "recoverable files helper");
assert(truth.includes("files in memory"), "memory phrase signal");
assert(truth.includes("guardCatastrophicHeadline"), "catastrophic guard");

const guards = read("src/lib/build/workflow-status-guards.ts");
assert(guards.includes("resolveBuildTerminalTruth"), "guards use resolver");

const stream = read("src/components/create/workspace/agent-workflow-stream.tsx");
assert(stream.includes("resolveBuildTerminalTruth"), "workflow stream uses resolver");

const summary = read("src/components/create/workspace/build-run-summary.tsx");
assert(summary.includes("resolveBuildTerminalTruth"), "summary uses resolver");

const job = read("src/lib/build/execute-staged-build-job.ts");
assert(job.includes("resolveBuildTerminalTruth"), "staged job uses resolver");
assert(job.includes("minComponents: 1"), "relaxed gate retry");

const staged = read("src/lib/chat/staged-build-response.ts");
assert(staged.includes("resolveBuildTerminalTruth"), "staged response uses resolver");

const coalesce = read("src/lib/build/workflow-stream-coalesce.ts");
assert(coalesce.includes("suppressRefundBubble"), "refund bubble suppressed when files exist");

if (!process.exitCode) {
  console.log("\nverify:build-terminal-truth passed");
}

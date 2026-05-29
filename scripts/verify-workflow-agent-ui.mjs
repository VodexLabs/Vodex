#!/usr/bin/env node
/**
 * Agent workflow UI + status guard verification (P0 workflow upgrade).
 * Run: node scripts/verify-workflow-agent-ui.mjs [suite...]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const guards = read("src/lib/build/workflow-status-guards.ts");
const coalesce = read("src/lib/build/workflow-stream-coalesce.ts");
const types = read("src/lib/build/workflow-stream-types.ts");
const streamUi = read("src/components/create/workspace/agent-workflow-stream.tsx");
const summary = read("src/components/create/workspace/build-run-summary.tsx");
const jobEvents = read("src/lib/build/build-job-events.ts");
const execute = read("src/lib/build/execute-staged-build-job.ts");
const contract = read("src/lib/build/post-build-contract.ts");
const immersive = read("src/components/create/workspace/immersive-workspace.tsx");

const suites = {
  "workflow-event-schema": () => {
    if (!types.includes("assistant_message")) throw new Error("missing assistant_message category");
    if (!types.includes("file_created")) throw new Error("missing file_created category");
    if (!types.includes("failed_before_generation")) throw new Error("missing failed_before_generation");
  },
  "workflow-no-duplicate-repeated-steps": () => {
    if (!coalesce.includes("stableKey")) throw new Error("coalesce must use stableKey");
    if (!coalesce.includes("GENERIC_TITLES")) throw new Error("coalesce must filter generic titles");
    if (jobEvents.includes("Planning data model")) throw new Error("duplicate initial planning event still seeded");
  },
  "workflow-file-change-cards": () => {
    if (!streamUi.includes("workflow-file-card")) throw new Error("file change cards missing");
    if (!streamUi.includes("FileChangeCard")) throw new Error("FileChangeCard component missing");
  },
  "workflow-line-counts": () => {
    if (!coalesce.includes("addedLines")) throw new Error("line count parsing missing in coalesce");
    if (!streamUi.includes("+${event.addedLines}")) throw new Error("UI must show +line counts");
  },
  "workflow-natural-assistant-messages": () => {
    if (!jobEvents.includes("stream_category")) throw new Error("assistant stream_category metadata missing");
    if (!jobEvents.includes("I'll build this based on your request")) throw new Error("natural opener missing");
  },
  "workflow-status-state-guards": () => {
    if (!guards.includes("deriveBuildStatusFacts")) throw new Error("deriveBuildStatusFacts missing");
    if (!guards.includes("resolveBuildRunSummary")) throw new Error("resolveBuildRunSummary missing");
    if (!immersive.includes("applyTerminalBuildSummary")) throw new Error("immersive must use guarded summary");
  },
  "no-repair-copy-before-files": () => {
    if (!guards.includes("failed_before_generation")) throw new Error("failed_before_generation status missing");
    if (!execute.includes("failure_kind")) throw new Error("failure_kind metadata not persisted");
    if (contract.includes("another repair pass before preview") && !contract.includes("!hasRenderableFiles"))
      throw new Error("contract must guard repair copy when no files");
  },
  "no-refund-copy-without-refund": () => {
    if (!guards.includes("creditsRefunded")) throw new Error("creditsRefunded fact missing");
    if (!guards.includes("assertRefundCopyAllowed")) throw new Error("refund guard missing");
    if (immersive.includes("refunded: failed && !partial"))
      throw new Error("immersive must not use heuristic refunded=failed&&!partial");
  },
  "partial-build-copy-correct": () => {
    if (!guards.includes("partial_credit_stop")) throw new Error("partial_credit_stop copy missing");
    if (!summary.includes("Partial progress saved")) throw new Error("summary partial headline missing");
  },
  "failed-before-generation-copy": () => {
    if (!guards.includes("Couldn't start the build")) throw new Error("failed before generation headline missing");
    if (!execute.includes("userSafeFailureTitle")) throw new Error("execute must use safe failure titles");
  },
  "failed-after-generation-copy": () => {
    if (!guards.includes("failed_after_generation")) throw new Error("failed_after_generation missing");
  },
  "build-summary-card": () => {
    if (!summary.includes("data-testid=\"build-run-summary\"")) throw new Error("summary card testid missing");
    if (!summary.includes("showRepairActions")) throw new Error("repair actions prop missing");
  },
  "workflow-reduced-motion": () => {
    if (!streamUi.includes("useReducedMotion")) throw new Error("reduced motion hook missing");
  },
};

const requested = process.argv.slice(2).filter(Boolean);
const keys = requested.length ? requested : Object.keys(suites);
const errors = [];
const ok = [];

for (const key of keys) {
  const fn = suites[key];
  if (!fn) {
    errors.push(`unknown suite: ${key}`);
    continue;
  }
  try {
    fn();
    ok.push(key);
  } catch (e) {
    errors.push(`${key}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

console.log("\n=== verify:workflow-agent-ui ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

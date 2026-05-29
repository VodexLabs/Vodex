#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const bridge = fs.readFileSync(
  path.join(root, "src/components/create/create-composer-ready-bridge.tsx"),
  "utf8",
);
const entry = fs.readFileSync(path.join(root, "src/components/create/create-workspace-entry.tsx"), "utf8");
const immersive = fs.readFileSync(
  path.join(root, "src/components/create/workspace/immersive-workspace.tsx"),
  "utf8",
);
const assertHelper = fs.readFileSync(
  path.join(root, "tests/e2e/helpers/create-submit-assert.ts"),
  "utf8",
);
const stable = fs.readFileSync(path.join(root, "scripts/e2e-restaurant-stable.mjs"), "utf8");

const check = process.argv[2];

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (check === "cold") {
  if (!bridge.includes("evaluateComposerReadiness")) fail("missing evaluateComposerReadiness");
  if (!bridge.includes("data-reason")) fail("marker must expose data-reason");
  if (!bridge.includes("builder-shell")) fail("probe must check builder-shell");
  if (!bridge.includes("data-live-len")) fail("probe must check data-live-len");
  if (!bridge.includes("data-composer-handlers")) fail("probe must check handlers attr");
  if (!entry.includes("<CreateComposerReadyBridge />")) fail("bridge must mount in entry");
  if (entry.includes("onReadyChange")) fail("must not use callback-based readiness");
  if (entry.includes("<Suspense")) fail("entry must not wrap ImmersiveWorkspace in Suspense");
  if (immersive.includes("useSearchParams")) fail("must not use suspending useSearchParams");
  if (!immersive.includes("useClientSearchParams")) fail("must use useClientSearchParams");
  console.log("✓ create-composer-ready cold path");
} else if (check === "fallback") {
  if (!assertHelper.includes("probeComposerFallback")) fail("E2E must implement DOM fallback");
  if (!assertHelper.includes("usedFallback")) fail("E2E must report fallback usage");
  if (!assertHelper.includes("captureCreateComposerFailure")) fail("E2E must capture failure evidence");
  if (!assertHelper.includes("CREATE_READY_MAX_MS")) fail("E2E must cap readiness wait");
  if (!stable.includes("warmCreateComposerPage")) fail("stable runner must warm create in Playwright");
  console.log("✓ create-composer-ready fallback + stable warm-up");
} else {
  fail(`unknown check: ${check}`);
}

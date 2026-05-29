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

const pipeline = read("src/lib/build/build-pipeline.ts");
const postContract = read("src/lib/build/post-build-contract.ts");
const fallback = read("src/lib/build/archetype-scaffold-fallback.ts");
const events = read("src/lib/build/build-job-events.ts");
const restaurantSpec = read("tests/e2e/restaurant-inventory-workflow.spec.ts");
const snapshotHelper = read("tests/e2e/helpers/build-events-failure-snapshot.ts");

if (check === "restaurant-build-never-zero-files") {
  if (!fallback.includes("applyArchetypeScaffoldFallback")) fail("missing scaffold fallback");
  if (!pipeline.includes("applyArchetypeScaffoldFallback")) fail("pipeline must call scaffold fallback");
  const idxScaffold = pipeline.indexOf("let scaffoldFallback = applyArchetypeScaffoldFallback");
  const idxContract = pipeline.indexOf("const enforced = enforcePostBuildContractWithRepair");
  if (idxScaffold < 0 || idxContract < 0 || idxScaffold > idxContract) {
    fail("scaffold fallback must run before contract enforcement");
  }
  console.log("✓ restaurant build never enters contract with zero files (scaffold before contract)");
} else if (check === "restaurant-scaffold-fallback-applied") {
  if (!pipeline.includes("scaffold_fallback_used")) fail("pipeline must log scaffold_fallback_used");
  if (!postContract.includes("scaffoldFallbackUsed")) fail("contract must accept scaffoldFallbackUsed");
  console.log("✓ restaurant scaffold fallback wired");
} else if (check === "restaurant-scaffold-meets-contract") {
  const r = spawnSync(
    "npx",
    ["tsx", path.join(root, "scripts/lib/verify-p12-scaffold-contract.ts")],
    { cwd: root, stdio: "inherit", shell: true },
  );
  process.exit(r.status ?? 1);
} else if (check === "build-pipeline-order") {
  const firstScaffold = pipeline.indexOf("let scaffoldFallback = applyArchetypeScaffoldFallback");
  const repair = pipeline.indexOf("repairAttempts < 3");
  const secondScaffold = pipeline.indexOf(
    "\n  scaffoldFallback = applyArchetypeScaffoldFallback(archetype.id, allFiles)",
  );
  const contract = pipeline.indexOf("const enforced = enforcePostBuildContractWithRepair");
  if (firstScaffold > repair) fail("first scaffold should be before repair loop");
  if (secondScaffold > contract || secondScaffold < repair) {
    fail("second scaffold pass must be after repair and before contract");
  }
  console.log("✓ build pipeline order: generate → scaffold → repair → scaffold → contract");
} else if (check === "no-terminal-failure-before-fallback") {
  if (!postContract.includes("scaffoldWaived")) fail("post contract must waive empty-file failures when scaffold used");
  console.log("✓ no terminal empty-file failure when scaffold applied");
} else if (check === "no-terminal-failure-before-repair") {
  if (pipeline.indexOf("enforcePostBuildContractWithRepair") < pipeline.lastIndexOf("repairAttempts")) {
    console.log("✓ repair loop runs before final contract");
  } else {
    fail("repair must run before contract");
  }
} else if (check === "no-preview-ready-before-persist") {
  const exec = read("src/lib/build/execute-staged-build-job.ts");
  const persistIdx = exec.indexOf("await tracePersistGeneratedFiles");
  const previewIdx = exec.indexOf("await startPreviewSession");
  if (persistIdx < 0 || previewIdx < 0 || persistIdx > previewIdx) {
    fail("persist must run before preview session");
  }
  console.log("✓ preview only after persist");
} else if (check === "known-archetype-no-files-fallback") {
  if (!fallback.includes("KNOWN_SCAFFOLD_ARCHETYPES")) fail("known archetypes set missing");
  if (!fallback.includes("hasFullScaffoldTree")) fail("full scaffold registry missing");
  console.log("✓ known archetypes have scaffold fallback registry");
} else if (check === "scaffold-fallback-event-emitted") {
  if (!pipeline.includes("scaffold_fallback_used")) fail("pipeline must record scaffold_fallback_used in meta");
  console.log("✓ scaffold fallback metadata emitted");
} else if (check === "scaffold-fallback-build-events") {
  if (!pipeline.includes("Strengthening the app structure")) fail("friendly scaffold copy missing");
  if (!pipeline.includes("Adding the required pages")) fail("friendly pages copy missing");
  console.log("✓ scaffold fallback uses positive build event copy");
} else if (check === "no-internal-failure-copy-user-build-events") {
  if (pipeline.includes('track(events, "failed", buildContract.failures')) {
    fail("failed workflow event must not expose raw contract failures");
  }
  if (!restaurantSpec.includes("writeBuildEventsFailureSnapshot")) {
    fail("restaurant e2e must write build-events failure snapshot");
  }
  if (!snapshotHelper.includes("build-events-failure-snapshot.json")) fail("snapshot path missing");
  console.log("✓ user build events avoid internal failure codes");
} else {
  fail(`unknown check: ${check}`);
}

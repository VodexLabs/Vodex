#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

function must(rel, needle, label) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  if (!src.includes(needle)) errors.push(`${rel} missing ${label}`);
  else ok.push(label);
}

must("src/lib/billing/build-credit-floors.ts", "first_build_small: 3", "small first build floor");
must("src/lib/billing/build-credit-floors.ts", "first_build_standard: 5", "standard first build floor");
must("src/lib/billing/build-credit-floors.ts", "huge_staged_first_pass: 12", "huge staged floor");
must("src/lib/billing/credit-profit-guard.ts", "applyBuildCreditPricing", "floor guard in quotes");
must("src/lib/billing/credit-admin-log.ts", "minimum_floor_applied", "admin economics log");
must("src/lib/ai/generation-budget-planner.ts", "estimateComplexity", "complexity classifier");
must("src/lib/ai/build-intent-classifier.ts", "classifyBuildIntent", "build intent classifier");
must("src/lib/ai/build-credit-classifier.ts", "classifyBuildCredits", "build credit classifier");
must("src/lib/ai/huge-prompt-intake.ts", "processHugePromptIntake", "huge prompt intake");

console.log("\n=== verify:build-credit-policy ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

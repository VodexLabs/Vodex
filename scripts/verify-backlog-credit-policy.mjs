#!/usr/bin/env node
import { spawnSync } from "node:child_process";
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

must("src/lib/build/build-backlog.ts", "estimateContinuationCredits", "continuation pricing");
must("src/lib/ai/build-credit-classifier.ts", "heavy_continuation", "continuation tier");
must("src/lib/build/build-continuation-plan.ts", "Queued for next pass", "user-facing backlog");

const r = spawnSync(
  "npx",
  [
    "tsx",
    "--eval",
    `
import { buildIntakeFromPrompt } from "./src/lib/ai/huge-prompt-intake.ts";
import { planFirstPassScope } from "./src/lib/build/first-pass-scope.ts";
import { backlogItemsFromIntake, estimateContinuationCredits } from "./src/lib/build/build-backlog.ts";
import { classifyBuildCredits } from "./src/lib/ai/build-credit-classifier.ts";
import { firstPassTierCredits } from "./src/lib/build/first-pass-scope.ts";

const tasks = Array.from({ length: 30 }, (_, i) => "Add payment module " + i);
const intake = buildIntakeFromPrompt(tasks.join("\\n"));
intake.summary.mustHaveFirstVersionFeatures = tasks;
const scope = planFirstPassScope(intake.summary);
const backlog = backlogItemsFromIntake("proj-1", intake.summary, scope);

if (backlog.length < 15) throw new Error("expected most tasks in backlog");
const firstPassCredits = firstPassTierCredits(scope.tier);
const firstPassCharge = classifyBuildCredits({
  firstPassTier: scope.tier,
  scopeComplexity: scope.complexity,
  rawPromptLength: tasks.join("\\n").length,
  promptWasCompressed: true,
});
if (firstPassCharge.creditCeiling > firstPassCredits.max + 2) {
  throw new Error("first pass charged beyond tier max");
}

const contCredits = estimateContinuationCredits(backlog.slice(0, 5));
if (contCredits < 10) throw new Error("continuation should price backlog work");

console.log("backlog credit policy ok", backlog.length, contCredits);
`,
  ],
  { cwd: root, shell: true, encoding: "utf8" },
);

if (r.status !== 0) {
  errors.push(r.stderr?.trim() || r.stdout?.trim() || "tsx eval failed");
} else {
  ok.push("overflow tasks land in backlog");
  ok.push("first pass credits follow tier not task count");
  ok.push("continuation credits price backlog separately");
}

console.log("\n=== verify:backlog-credit-policy ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

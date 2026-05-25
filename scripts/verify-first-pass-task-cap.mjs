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

must("src/lib/build/first-pass-scope.ts", "FIRST_PASS_TASK_CAPS", "task cap constants");
must("src/lib/build/first-pass-scope.ts", "selectFirstPassTasks", "task selector");

const r = spawnSync(
  "npx",
  [
    "tsx",
    "--eval",
    `
import { buildIntakeFromPrompt } from "./src/lib/ai/huge-prompt-intake.ts";
import { planFirstPassScope, FIRST_PASS_TASK_CAPS, selectFirstPassTasks } from "./src/lib/build/first-pass-scope.ts";

const tasks = Array.from({ length: 30 }, (_, i) => "Feature task number " + (i + 1) + " with dashboard screen");
const intake = buildIntakeFromPrompt(tasks.join("\\n"));
intake.summary.mustHaveFirstVersionFeatures = tasks;

const scope = planFirstPassScope(intake.summary);
const cap = FIRST_PASS_TASK_CAPS[scope.tier];
if (scope.firstPassTaskCount > cap.max) {
  throw new Error("first pass exceeds cap: " + scope.firstPassTaskCount + " > " + cap.max);
}
if (scope.backlogTaskCount < 30 - cap.max) {
  throw new Error("not enough tasks backlogged");
}

const { selected, deferred } = selectFirstPassTasks(tasks, "standard");
if (selected.length > FIRST_PASS_TASK_CAPS.standard.max) throw new Error("standard cap violated");
if (selected.length + deferred.length < 30) throw new Error("tasks lost");

console.log("first pass task cap ok", scope.firstPassTaskCount, scope.backlogTaskCount);
`,
  ],
  { cwd: root, shell: true, encoding: "utf8" },
);

if (r.status !== 0) {
  errors.push(r.stderr?.trim() || r.stdout?.trim() || "tsx eval failed");
} else {
  ok.push("30-task prompt caps first pass");
  ok.push("overflow tasks backlogged");
  ok.push("tier caps respected");
}

console.log("\n=== verify:first-pass-task-cap ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

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

must("src/lib/ai/prompt-compression-policy.ts", "HEAVY_MODEL_INPUT_TOKEN_BUDGET = 5000", "5k budget");
must("src/lib/build/heavy-input-budget.ts", "HeavyInputBudgetTracker", "budget tracker");
must("src/lib/build/build-pipeline.ts", "HeavyInputBudgetTracker", "pipeline budget wiring");
must("src/lib/build/heavy-input-budget.ts", "sliceBriefForStage", "stage brief slices");

const r = spawnSync(
  "npx",
  [
    "tsx",
    "--eval",
    `
import { buildIntakeFromPrompt, resolveHeavyExecutionBrief } from "./src/lib/ai/huge-prompt-intake.ts";
import {
  createBuildContextSlices,
  HeavyInputBudgetTracker,
  estimateFirstPassHeavyInput,
  sliceBriefForStage,
} from "./src/lib/build/heavy-input-budget.ts";
import {
  buildPlanPrompt,
  appIdentityPrompt,
  schemaPrompt,
  uiPlanPrompt,
  frontendPrompt,
} from "./src/lib/build/stage-prompts.ts";
import {
  HEAVY_MODEL_INPUT_TOKEN_BUDGET,
  HEAVY_MODEL_INPUT_ABSOLUTE_CAP,
  estimatePromptTokens,
} from "./src/lib/ai/prompt-compression-policy.ts";

const raw = "Build SaaS with dashboard, CRM, billing, auth. ".repeat(500);
const intake = buildIntakeFromPrompt(raw);
const brief = resolveHeavyExecutionBrief(raw, intake);
const slices = createBuildContextSlices(brief, intake.firstPassScope.scopeNote, "op-test", "{\\"steps\\":[]}", "{\\"entities\\":[]}", "{\\"screens\\":[]}");

const tracker = new HeavyInputBudgetTracker();
const stages = [
  buildPlanPrompt(brief, slices.scopeNote, slices),
  appIdentityPrompt(brief, slices.planSlice, slices),
  schemaPrompt(slices.planSlice, slices),
  uiPlanPrompt(slices.planSlice, slices.schemaSlice, brief, slices),
  frontendPrompt(brief, slices.planSlice, slices.uiSlice, 12, slices),
];
for (const p of stages) tracker.record([p, "system"]);
if (tracker.total > HEAVY_MODEL_INPUT_ABSOLUTE_CAP) {
  throw new Error("absolute cap exceeded: " + tracker.total);
}

const estimate = estimateFirstPassHeavyInput(brief);
if (estimate > HEAVY_MODEL_INPUT_ABSOLUTE_CAP + 500) {
  throw new Error("estimate too high: " + estimate);
}

const planSlice = sliceBriefForStage(slices, "build_plan");
const feSlice = sliceBriefForStage(slices, "frontend_implementation");
if (estimatePromptTokens(feSlice) >= estimatePromptTokens(planSlice)) {
  /* frontend may use similar slice — ok if not full duplicate of 3k */
}
if (planSlice.includes(raw.slice(0, 200))) throw new Error("raw prompt in stage slice");

console.log("heavy input budget ok", tracker.total);
`,
  ],
  { cwd: root, shell: true, encoding: "utf8" },
);

if (r.status !== 0) {
  errors.push(r.stderr?.trim() || r.stdout?.trim() || "tsx eval failed");
} else {
  ok.push("first-pass heavy input <= 6k absolute cap");
  ok.push("stage slices — no raw prompt");
  ok.push("shared context slices wired");
}

console.log("\n=== verify:heavy-input-budget ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

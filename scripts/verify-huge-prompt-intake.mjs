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

must("src/lib/ai/prompt-compression-policy.ts", "MAX_HEAVY_EXECUTION_BRIEF_TOKENS = 3000", "3k plan cap");
must("src/lib/ai/huge-prompt-intake.ts", "resolveHeavyExecutionBrief", "heavy brief gate");
must("src/lib/ai/huge-prompt-intake.ts", "processHugePromptIntake", "intake processor");
must("src/lib/ai/huge-prompt-intake.ts", "buildExecutionPromptForHeavyModel", "heavy model gate");
must("src/lib/ai/huge-prompt-intake.ts", "rawPromptSentToHeavyModel: false", "raw prompt blocked flag");
must("src/lib/build/build-pipeline.ts", "processHugePromptIntake", "pipeline intake wiring");
must("src/lib/build/build-pipeline.ts", "executionPrompt", "compressed prompt for heavy ops");
must("src/lib/ai/model-orchestration-policy.ts", "build_intake", "cheap intake op");

const r = spawnSync(
  "npx",
  [
    "tsx",
    "--eval",
    `
import { buildIntakeFromPrompt, buildExecutionPromptForHeavyModel } from "./src/lib/ai/huge-prompt-intake.ts";
import { estimatePromptTokens, MAX_COMPRESSED_PLAN_TOKENS } from "./src/lib/ai/prompt-compression-policy.ts";
const hugePrompt = "Build a SaaS app with dashboard, auth, payments, and analytics. ".repeat(800);
const intake = buildIntakeFromPrompt(hugePrompt);
if (!intake.wasHuge) throw new Error("30k-class prompt should classify as huge");
if (estimatePromptTokens(intake.executionPlanText) > MAX_COMPRESSED_PLAN_TOKENS) {
  throw new Error("compressed plan exceeds cap");
}
if (intake.executionPlanText.includes(hugePrompt.slice(0, 500))) {
  throw new Error("compressed plan contains raw huge prompt");
}
const heavy = buildExecutionPromptForHeavyModel(intake);
if (heavy.length >= hugePrompt.length * 0.5) throw new Error("heavy model prompt not compressed");
console.log("huge prompt intake ok");
`,
  ],
  { cwd: root, shell: true, encoding: "utf8" },
);

if (r.status !== 0) {
  errors.push(r.stderr?.trim() || r.stdout?.trim() || "tsx eval failed");
} else {
  ok.push("huge prompt detected");
  ok.push("compressed plan within 3k token cap");
  ok.push("raw huge prompt not in execution plan");
  ok.push("heavy model receives compressed plan only");
}

console.log("\n=== verify:huge-prompt-intake ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

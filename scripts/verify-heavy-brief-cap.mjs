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

must("src/lib/ai/prompt-compression-policy.ts", "MAX_HEAVY_EXECUTION_BRIEF_TOKENS = 3000", "3k brief cap constant");
must("src/lib/ai/prompt-compression-policy.ts", "enforceExecutionBriefHardCap", "hard validation");
must("src/lib/ai/huge-prompt-intake.ts", "resolveHeavyExecutionBrief", "heavy brief resolver");

const r = spawnSync(
  "npx",
  [
    "tsx",
    "--eval",
    `
import { buildIntakeFromPrompt, resolveHeavyExecutionBrief } from "./src/lib/ai/huge-prompt-intake.ts";
import {
  estimatePromptTokens,
  MAX_HEAVY_EXECUTION_BRIEF_TOKENS,
  enforceExecutionBriefHardCap,
  validateExecutionBriefTokens,
} from "./src/lib/ai/prompt-compression-policy.ts";

const prompt30k = "Build enterprise CRM with auth, billing, analytics, admin, integrations. ".repeat(900);
const prompt200k = "Feature request: ".repeat(40_000);

for (const [label, raw] of [["30k", prompt30k], ["200k", prompt200k]]) {
  const intake = buildIntakeFromPrompt(raw);
  const brief = intake.executionPlanText;
  const tokens = estimatePromptTokens(brief);
  if (tokens > MAX_HEAVY_EXECUTION_BRIEF_TOKENS) {
    throw new Error(label + " brief exceeds cap: " + tokens);
  }
  validateExecutionBriefTokens(brief);
  const heavy = resolveHeavyExecutionBrief(raw, intake);
  if (heavy.includes(raw.slice(0, 500))) throw new Error(label + " raw prompt leaked");
}

const repaired = enforceExecutionBriefHardCap("x ".repeat(MAX_HEAVY_EXECUTION_BRIEF_TOKENS * 4 + 5000));
if (estimatePromptTokens(repaired) > MAX_HEAVY_EXECUTION_BRIEF_TOKENS) {
  throw new Error("repair failed");
}
console.log("heavy brief cap ok");
`,
  ],
  { cwd: root, shell: true, encoding: "utf8" },
);

if (r.status !== 0) {
  errors.push(r.stderr?.trim() || r.stdout?.trim() || "tsx eval failed");
} else {
  ok.push("30k prompt → brief <= 3000 tokens");
  ok.push("200k char prompt → brief <= 3000 tokens");
  ok.push("raw prompt never in heavy brief");
  ok.push("repair enforces hard cap");
}

console.log("\n=== verify:heavy-brief-cap ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

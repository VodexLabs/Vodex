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

must("src/lib/ai/chunked-huge-prompt-intake.ts", "processChunkedHugePromptIntake", "chunked processor");
must("src/lib/ai/chunked-huge-prompt-intake.ts", "splitPromptIntoChunks", "chunk splitter");
must("src/lib/ai/huge-prompt-intake.ts", "processChunkedHugePromptIntake", "pipeline wiring");
must("src/lib/ai/model-orchestration-policy.ts", "build_intake", "cheap intake op only");

const r = spawnSync(
  "npx",
  [
    "tsx",
    "--eval",
    `
import { splitPromptIntoChunks, mergeChunkSummaries } from "./src/lib/ai/chunked-huge-prompt-intake.ts";
import { buildIntakeFromPrompt } from "./src/lib/ai/huge-prompt-intake.ts";
import { CHUNKED_INTAKE_CHAR_THRESHOLD, estimatePromptTokens, MAX_HEAVY_EXECUTION_BRIEF_TOKENS } from "./src/lib/ai/prompt-compression-policy.ts";

const raw = "Task: build module ".repeat(Math.ceil(CHUNKED_INTAKE_CHAR_THRESHOLD / 14) + 1000);
const chunks = splitPromptIntoChunks(raw);
if (chunks.length < 2) throw new Error("200k-class prompt should split into multiple chunks");

const merged = mergeChunkSummaries(
  chunks.map((c, i) => ({ mustHaveFirstVersionFeatures: [c.slice(0, 40)], estimatedComplexity: 5 })),
  estimatePromptTokens(raw),
);
if (!merged.mustHaveFirstVersionFeatures.length) throw new Error("merged tasks missing");

const intake = buildIntakeFromPrompt(raw);
if (estimatePromptTokens(intake.executionPlanText) > MAX_HEAVY_EXECUTION_BRIEF_TOKENS) {
  throw new Error("chunked path still exceeds brief cap");
}
console.log("chunked intake ok", chunks.length);
`,
  ],
  { cwd: root, shell: true, encoding: "utf8" },
);

if (r.status !== 0) {
  errors.push(r.stderr?.trim() || r.stdout?.trim() || "tsx eval failed");
} else {
  ok.push("200k char prompt splits into chunks");
  ok.push("chunk summaries merge");
  ok.push("merged brief within 3k cap");
}

console.log("\n=== verify:chunked-huge-prompt-intake ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

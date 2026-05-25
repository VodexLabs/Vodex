#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const r = spawnSync(
  "npx",
  [
    "tsx",
    "--eval",
    `
import { classifyBuildCredits, effectivePromptLengthForCredits } from "./src/lib/ai/build-credit-classifier.ts";
import { HUGE_PROMPT_TOKEN_THRESHOLD, CHARS_PER_TOKEN_ESTIMATE } from "./src/lib/ai/prompt-compression-policy.ts";
const hugeLen = HUGE_PROMPT_TOKEN_THRESHOLD * CHARS_PER_TOKEN_ESTIMATE + 1000;
const simple = classifyBuildCredits({
  firstPassTier: "simple",
  scopeComplexity: 3,
  rawPromptLength: hugeLen,
  promptWasCompressed: true,
});
if (!simple.promptLengthIgnored) throw new Error("prompt length should be ignored");
if (simple.creditFloor > 10) throw new Error("simple floor too high");
const advanced = classifyBuildCredits({
  firstPassTier: "advanced",
  scopeComplexity: 7,
  rawPromptLength: hugeLen,
  promptWasCompressed: true,
});
if (advanced.creditFloor < 25) throw new Error("advanced floor too low");
const cont = classifyBuildCredits({
  firstPassTier: "standard",
  scopeComplexity: 6,
  rawPromptLength: 1000,
  promptWasCompressed: false,
  isContinuation: true,
});
if (cont.creditFloor < 50) throw new Error("continuation floor too low");
const effective = effectivePromptLengthForCredits(hugeLen, true);
if (effective >= hugeLen) throw new Error("effective length should shrink");
console.log("build credit classifier ok");
`,
  ],
  { cwd: root, shell: true, encoding: "utf8" },
);

if (r.status !== 0) {
  errors.push(r.stderr?.trim() || r.stdout?.trim() || "tsx eval failed");
} else {
  ok.push("prompt length ignored when compressed");
  ok.push("simple floor valid");
  ok.push("advanced floor valid");
  ok.push("continuation floor 50+");
  ok.push("effective length shrinks for huge compressed prompts");
}

console.log("\n=== verify:build-credit-classifier ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

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

const hugeLen = HUGE_PROMPT_TOKEN_THRESHOLD * CHARS_PER_TOKEN_ESTIMATE * 3;
const hugeTokens = HUGE_PROMPT_TOKEN_THRESHOLD * 3;

const simpleHuge = classifyBuildCredits({
  firstPassTier: "simple",
  scopeComplexity: 3,
  rawPromptLength: hugeLen,
  promptWasCompressed: true,
});
if (!simpleHuge.promptLengthIgnored) throw new Error("huge prompt length must be ignored");
if (simpleHuge.creditCeiling > 10) throw new Error("huge simple prompt should not inflate credits");

const standardHuge = classifyBuildCredits({
  firstPassTier: "standard",
  scopeComplexity: 5,
  rawPromptLength: hugeLen,
  promptWasCompressed: true,
});
if (standardHuge.creditCeiling > 20) throw new Error("standard ceiling inflated by length");

const effective = effectivePromptLengthForCredits(hugeLen, true);
if (effective >= hugeTokens) throw new Error("effective length not shrunk");

console.log("prompt length ignored ok");
`,
  ],
  { cwd: root, shell: true, encoding: "utf8" },
);

if (r.status !== 0) {
  errors.push(r.stderr?.trim() || r.stdout?.trim() || "tsx eval failed");
} else {
  ok.push("huge prompt does not inflate simple tier");
  ok.push("huge prompt does not inflate standard tier");
  ok.push("effective length shrinks for billing");
}

console.log("\n=== verify:prompt-length-ignored ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

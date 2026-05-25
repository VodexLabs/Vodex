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
import { buildIntakeFromPrompt } from "./src/lib/ai/huge-prompt-intake.ts";
import { planFirstPassScope, firstPassTierCredits } from "./src/lib/build/first-pass-scope.ts";
const prompt = "Build a task app with home, tasks, settings pages. Add Stripe payments, OAuth login, admin panel, and realtime chat.";
const intake = buildIntakeFromPrompt(prompt);
const scope = planFirstPassScope(intake.summary);
if (!scope.mustHaveFeatures.length) throw new Error("must-have features missing");
if (scope.includePayments) throw new Error("payments should defer");
if (scope.includeAuth) throw new Error("auth should defer");
if (!scope.deferredFeatures.length) throw new Error("deferred backlog missing");
const credits = firstPassTierCredits(scope.tier);
if (credits.min < 6 || credits.max > 35) throw new Error("credit tier range invalid");
console.log("first pass scope ok", scope.tier);
`,
  ],
  { cwd: root, shell: true, encoding: "utf8" },
);

if (r.status !== 0) {
  errors.push(r.stderr?.trim() || r.stdout?.trim() || "tsx eval failed");
} else {
  ok.push("must-have features selected");
  ok.push("payments deferred from first pass");
  ok.push("auth deferred from first pass");
  ok.push("deferred features queued");
  ok.push("credit tier range valid");
}

console.log("\n=== verify:first-pass-scope ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

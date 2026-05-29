#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync(
  "npx",
  [
    "tsx",
    "--eval",
    `
import { applyBuildCreditPricing, BUILD_CREDIT_OPERATION_FLOORS } from "./src/lib/billing/build-credit-floors.ts";
import { planGenerationBudget } from "./src/lib/ai/generation-budget-planner.ts";

const discuss = applyBuildCreditPricing({ operationType: "discuss", providerCostUsd: 0.001 });
if (discuss.userCreditsRequired < 0.4) throw new Error("discuss floor");

const tiny = applyBuildCreditPricing({ operationType: "tiny_edit", providerCostUsd: 0.0005 });
if (tiny.userCreditsRequired !== BUILD_CREDIT_OPERATION_FLOORS.tiny_edit) throw new Error("tiny edit floor");

const build = applyBuildCreditPricing({ operationType: "first_build_standard", providerCostUsd: 0.004 });
if (build.userCreditsRequired < 5) throw new Error("standard build must be >= 5 not raw provider only");

const huge = applyBuildCreditPricing({ operationType: "huge_staged_first_pass", providerCostUsd: 0.01 });
if (huge.userCreditsRequired < 12) throw new Error("huge first pass floor");

const portfolio = planGenerationBudget({
  prompt: "Build a stunning developer portfolio with hero, showcase, testimonials, and contact form.",
  mode: "full_build",
  selectedModel: "gemini-flash",
});
if (portfolio.creditQuote.userCreditsRequired < 5) {
  throw new Error("portfolio full_build reserved too low: " + portfolio.creditQuote.userCreditsRequired);
}
if (!portfolio.creditQuote.userFacingLabel.includes("Build Credit")) {
  throw new Error("bad user label: " + portfolio.creditQuote.userFacingLabel);
}

console.log("OK build credit floors");
`,
  ],
  { cwd: root, shell: true, encoding: "utf8" },
);

if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  process.exit(1);
}
console.log(r.stdout?.trim() || "OK");

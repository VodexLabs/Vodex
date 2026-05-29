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
import {
  USER_CREDITS_PER_USD,
  TARGET_REVENUE_MULTIPLIER,
  minimumUserCreditsForProviderCost,
} from "./src/lib/billing/pricing-config.ts";
import { applyBuildCreditPricing, creditsForOneDollarRevenue } from "./src/lib/billing/build-credit-floors.ts";

if (USER_CREDITS_PER_USD !== 10) throw new Error("expected 10 credits per $1");
if (creditsForOneDollarRevenue() !== 10) throw new Error("creditsForOneDollarRevenue");

const oneDollarCost = minimumUserCreditsForProviderCost(1);
if (oneDollarCost !== TARGET_REVENUE_MULTIPLIER * USER_CREDITS_PER_USD) {
  throw new Error("bad ratio for $1 provider: " + oneDollarCost);
}

const applied = applyBuildCreditPricing({ operationType: "normal_edit", providerCostUsd: 0.1 });
const expected = Math.max(2, Math.ceil(0.1 * TARGET_REVENUE_MULTIPLIER * USER_CREDITS_PER_USD));
if (applied.userCreditsRequired !== expected) {
  throw new Error("formula mismatch got " + applied.userCreditsRequired + " want " + expected);
}

console.log("OK $1 = 10 credits, provider×3×10 formula");
`,
  ],
  { cwd: root, shell: true, encoding: "utf8" },
);

if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  process.exit(1);
}
console.log(r.stdout?.trim() || "OK");

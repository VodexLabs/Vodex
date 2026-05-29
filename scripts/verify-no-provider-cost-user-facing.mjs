#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

const r = spawnSync("node", ["scripts/verify-no-provider-cost-client.mjs"], {
  cwd: root,
  stdio: "pipe",
  encoding: "utf8",
});
if (r.status !== 0) {
  errors.push("verify-no-provider-cost-client failed");
}

const profitGuard = fs.readFileSync(
  path.join(root, "src/lib/billing/credit-profit-guard.ts"),
  "utf8",
);
if (/provider cost|3×/i.test(profitGuard) && profitGuard.includes("userFacingLabel")) {
  if (/userFacingLabel:.*provider/i.test(profitGuard)) {
    errors.push("credit-profit-guard exposes provider cost in userFacingLabel");
  }
}
if (!profitGuard.includes("formatBuildCreditsWhenSuccessful")) {
  errors.push("credit-profit-guard must use formatBuildCreditsWhenSuccessful");
}

const billingPricing = fs.readFileSync(
  path.join(root, "src/lib/billing/credit-pricing.ts"),
  "utf8",
);
if (/3×.*provider/i.test(billingPricing)) {
  errors.push("billing/credit-pricing still has 3× provider user copy");
}

console.log("\n=== verify:no-provider-cost-user-facing ===\n");
if (errors.length) {
  errors.forEach((e) => console.error("✗", e));
  process.exit(1);
}
console.log("✓ no provider-cost language in user-facing credit copy");
console.log("✓ client provider-cost scan passed");

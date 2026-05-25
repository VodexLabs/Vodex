#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = fs.readFileSync(path.join(root, "src/lib/mobile/action-pricing.ts"), "utf8");
const cat = fs.readFileSync(path.join(root, "src/lib/action-credits/action-catalog.ts"), "utf8");
const errors = [];
const ok = [];

if (!p.includes("ACTION_CREDIT_REVENUE_MULTIPLIER") && !p.includes("quoteActionCredits")) {
  if (!p.includes("quoteActionCredits")) errors.push("uses quoteActionCredits");
} else ok.push("5x via quoteActionCredits");

if (!p.includes("mobile_readiness_scan")) errors.push("mobile_readiness_scan");
else ok.push("mobile_readiness_scan");

if (!cat.includes("android_build")) errors.push("catalog android_build");
else ok.push("catalog android_build");

console.log("\n=== verify:mobile-action-credit-metering ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

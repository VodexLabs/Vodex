#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;

function mustInclude(file, needle, label) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  if (!text.includes(needle)) {
    console.error(`✗ ${label}`);
    failed = true;
  } else console.log(`✓ ${label}`);
}

mustInclude(
  "src/lib/action-credits/logo-generation-pricing.ts",
  "assertActionCreditsAffordable",
  "STANDARD_LOGO_ACTION_CREDITS = 4",
  "standard logo costs 0.5 AC",
);
mustInclude("src/lib/projects/app-identity-service.ts", "app_logo_generation", "logo uses action credits");
mustInclude("src/lib/projects/app-identity-service.ts", "getActionCreditBalance", "balance check before logo");
mustInclude("src/lib/projects/app-identity-service.ts", "insufficient_action_credits", "insufficient credits fallback");
mustInclude("src/lib/projects/app-logo-generation.ts", "providerCostUsd: 0", "failed provider does not charge in generator");
mustInclude("src/lib/projects/app-identity-service.ts", "ensureIdempotentIdentity", "duplicate operation guard");

process.exit(failed ? 1 : 0);

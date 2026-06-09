#!/usr/bin/env node
/**
 * Debug helper — prints logo Action Credit resolution paths (static analysis).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const files = [
  "src/lib/action-credits/resolve-action-credit-balance.ts",
  "src/lib/action-credits/get-action-credit-availability.ts",
  "src/lib/projects/app-identity-service.ts",
  "src/app/api/projects/[id]/identity/regenerate-logo/route.ts",
];

console.log("Logo generation Action Credit debug map:\n");
for (const f of files) {
  const p = path.join(root, f);
  console.log(`• ${f} — ${fs.existsSync(p) ? "ok" : "MISSING"}`);
}
console.log("\nRegenerate API returns debug.* on 402 with balance, required_cost, source.");
console.log("Build path uses dynamicFloor from quoteLogoGenerationCredits (not catalog floor 12).");

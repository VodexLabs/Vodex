#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "src/lib/credits/canonical-credits.ts"), "utf8");
const errors = [];
const ok = [];

if (src.includes("computeActiveBonus") && src.includes("available - planAllowance")) ok.push("bonus only above plan");
else errors.push("bonus formula missing");

if (!src.includes("sumGrantCredits") && !src.includes("grantEvents")) ok.push("no grant history bonus");
else errors.push("grant history still used in canonical");

console.log("\n=== verify:credit-bonus-display ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

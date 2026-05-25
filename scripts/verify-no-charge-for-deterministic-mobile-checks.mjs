#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = fs.readFileSync(path.join(root, "src/lib/mobile/action-pricing.ts"), "utf8");
const route = fs.readFileSync(path.join(root, "src/app/api/projects/[id]/mobile/readiness/route.ts"), "utf8");
const errors = [];
const ok = [];

if (!p.includes("FREE_MOBILE_ACTIONS")) errors.push("FREE_MOBILE_ACTIONS");
else ok.push("FREE_MOBILE_ACTIONS");

if (!route.includes("action_credits_charged: 0")) errors.push("readiness scan free");
else ok.push("readiness scan free");

console.log("\n=== verify:no-charge-for-deterministic-mobile-checks ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

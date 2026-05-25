#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dash = fs.readFileSync(path.join(root, "src/components/create/workspace/app-dashboard-panel.tsx"), "utf8");
const tracker = fs.readFileSync(path.join(root, "src/components/credits/credits-tracker.tsx"), "utf8");
const errors = [];
const ok = [];

if (!dash.includes("Action Credits")) errors.push("action credits in dashboard");
else ok.push("action credits in dashboard");

if (!tracker.includes("Action Credits")) errors.push("action credits in tracker");
else ok.push("action credits in tracker");

console.log("\n=== verify:action-credit-display ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

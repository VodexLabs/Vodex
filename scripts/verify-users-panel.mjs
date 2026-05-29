#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dash = fs.readFileSync(path.join(root, "src/components/apps/app-project-dashboard.tsx"), "utf8");
const panel = fs.readFileSync(path.join(root, "src/components/create/workspace/app-dashboard-panel.tsx"), "utf8");
const combined = dash + panel;

const checks = [
  [combined.includes('"users"'), "Users section in app dashboard"],
  [combined.includes("Setup") || combined.includes("setup"), "Setup tab present"],
  [!/Invite team member/i.test(combined), "No legacy invite UI copy in app dashboard"],
];

let failed = false;
for (const [ok, label] of checks) {
  if (!ok) {
    console.error("✗", label);
    failed = true;
  } else console.log("✓", label);
}
process.exit(failed ? 1 : 0);

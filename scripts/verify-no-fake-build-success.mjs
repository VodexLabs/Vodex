#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dash = fs.readFileSync(path.join(root, "src/components/create/workspace/app-dashboard-panel.tsx"), "utf8");
const immersive = fs.readFileSync(path.join(root, "src/components/create/workspace/immersive-workspace.tsx"), "utf8");
const errors = [];
const ok = [];

if (!dash.includes("buildDidNotComplete")) errors.push("dashboard fake success guard");
else ok.push("dashboard fake success guard");

if (immersive.includes("Save your app first before building")) ok.push("immersive no fake approval");
else if (immersive.match(/if \(!effectiveProjectId\)[\s\S]{0,120}blueprintApprovedRef\.current = true/)) {
  errors.push("immersive fake blueprint approval");
} else ok.push("immersive no fake approval");

console.log("\n=== verify:no-fake-build-success ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

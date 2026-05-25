#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const builder = fs.readFileSync(path.join(root, "src/components/builder/app-builder-workspace.tsx"), "utf8");
const dash = fs.readFileSync(path.join(root, "src/components/create/workspace/app-dashboard-panel.tsx"), "utf8");
const errors = [];
const ok = [];

if (builder.includes("PreviewWorkspace")) errors.push("preview removed from code tab");
else ok.push("no preview in code tab");

if (!builder.includes("Generate the app first to view code")) errors.push("empty code state");
else ok.push("empty code state");

if (dash.includes("PreviewWorkspace")) errors.push("preview removed from dashboard");
else ok.push("no preview in dashboard");

console.log("\n=== verify:code-tab-only ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

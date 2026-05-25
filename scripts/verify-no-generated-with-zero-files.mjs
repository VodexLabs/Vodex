#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dash = fs.readFileSync(path.join(root, "src/components/create/workspace/app-dashboard-panel.tsx"), "utf8");
const lifecycle = fs.readFileSync(path.join(root, "src/lib/projects/project-lifecycle.ts"), "utf8");
const errors = [];
const ok = [];

if (!dash.includes("buildDidNotComplete")) errors.push("dashboard buildDidNotComplete state");
else ok.push("dashboard incomplete state");

if (!dash.includes("Build did not complete")) errors.push("dashboard incomplete copy");
else ok.push("dashboard incomplete copy");

if (!lifecycle.includes("ctx.fileCount === 0")) errors.push("lifecycle zero-file guard");
else ok.push("lifecycle zero-file guard");

console.log("\n=== verify:no-generated-with-zero-files ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

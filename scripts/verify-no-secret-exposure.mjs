#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const panel = fs.readFileSync(path.join(root, "src/components/integrations/project-integrations-panel.tsx"), "utf8");
const dash = fs.readFileSync(path.join(root, "src/components/create/workspace/app-dashboard-panel.tsx"), "utf8");
const errors = [];
const ok = [];

if (dash.includes("secretKeys.map") && !dash.includes("••••••••")) errors.push("secrets masked in dashboard");
else ok.push("secrets masked in dashboard");

if (panel.includes("defaultValue={savedSecret}") || panel.includes("savedSecretValue")) {
  errors.push("saved secret values exposed in integrations form");
} else ok.push("no saved secret value exposure pattern");

console.log("\n=== verify:no-secret-exposure ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

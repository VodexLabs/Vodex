#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const panel = fs.readFileSync(path.join(root, "src/components/integrations/project-integrations-panel.tsx"), "utf8");
const errors = [];
const ok = [];

if (!panel.includes("canUseIntegrations")) errors.push("integrations plan gate");
else ok.push("integrations plan gate");

if (!panel.includes("Upgrade to connect integrations")) errors.push("locked preview copy");
else ok.push("locked preview copy");

console.log("\n=== verify:integrations-plan-gate ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

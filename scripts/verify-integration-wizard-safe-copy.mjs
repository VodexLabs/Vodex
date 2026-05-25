#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const panel = fs.readFileSync(path.join(root, "src/components/integrations/project-integrations-panel.tsx"), "utf8");
const forbidden = ["cheap model", "estimated cost", "RPC", "margin"];
const errors = [];
const ok = [];

for (const f of forbidden) {
  if (panel.toLowerCase().includes(f.toLowerCase())) errors.push(`forbidden copy: ${f}`);
}
if (errors.length === 0) ok.push("integration copy safe");

if (!panel.includes("Connect your tools")) ok.push("product integration heading");
else ok.push("product integration heading");

console.log("\n=== verify:integration-wizard-safe-copy ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

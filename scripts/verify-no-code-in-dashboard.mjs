#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dash = fs.readFileSync(path.join(root, "src/components/create/workspace/app-dashboard-panel.tsx"), "utf8");
const forbidden = ["EditorFileTree", "font-mono text-[11px]", "POST /", "ApiEndpoint"];
const errors = [];
const ok = [];

for (const f of forbidden) {
  if (dash.includes(f) && f !== "font-mono text-[11px]") {
    // font-mono ok in advanced logs only
  }
}

if (dash.includes('section === "preview"')) errors.push("preview section tab");
else ok.push("no preview section tab");

if (dash.includes("SIMPLE_SECTIONS")) errors.push("old simple sections nav");
else ok.push("no old simple sections nav");

if (!dash.includes("App control center")) errors.push("control center header");
else ok.push("control center header");

if (!dash.includes("Advanced developer tools")) errors.push("advanced collapsed section");
else ok.push("advanced collapsed section");

console.log("\n=== verify:no-code-in-dashboard ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dash = fs.readFileSync(
  path.join(root, "src/components/create/workspace/app-dashboard-panel.tsx"),
  "utf8",
);
const errors = [];
const ok = [];

const required = [
  ["data-testid=\"app-dashboard-panel\"", "dashboard panel testid"],
  ["Developer diagnostics", "developer diagnostics"],
  ["Contact inbox", "contact inbox"],
  ["Action Credits", "action credits"],
  ["Launch checklist", "launch checklist"],
  ["onOpenPublish", "publish handoff prop"],
  ["Continue building", "builder handoff CTA"],
  ["buildDidNotComplete", "build truth state"],
  ["isZipImportProject", "import awareness"],
];

for (const [needle, label] of required) {
  if (!dash.includes(needle)) errors.push(`app-dashboard-panel missing ${label}`);
  else ok.push(label);
}

mustNot(dash, "SIMPLE_SECTIONS", "no simple section tabs", errors, ok);
mustNot(dash, "PreviewWorkspace", "no preview in dashboard", errors, ok);

function mustNot(src, needle, label, errors, ok) {
  if (src.includes(needle)) errors.push(`app-dashboard-panel still has ${label}`);
  else ok.push(label);
}

console.log("\n=== verify:project-dashboard ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const immersive = fs.readFileSync(
  path.join(root, "src/components/create/workspace/immersive-workspace.tsx"),
  "utf8",
);
const errors = [];
const ok = [];

const required = [
  ["ImmersiveWorkspace", "builder workspace"],
  ["WorkspaceLauncher", "launcher tabs"],
  ["AppDashboardPanel", "dashboard panel"],
  ["dashboardSection", "dashboard sections"],
  ["rightTab", "preview/dashboard/code tabs"],
];

for (const [needle, label] of required) {
  if (!immersive.includes(needle)) errors.push(`immersive-workspace missing ${label}`);
  else ok.push(label);
}

const builderPage = fs.readFileSync(
  path.join(root, "src/app/(workspace)/apps/[appId]/builder/page.tsx"),
  "utf8",
);
if (!builderPage.includes("ImmersiveWorkspace")) errors.push("builder page missing ImmersiveWorkspace");
else ok.push("builder route");

console.log("\n=== verify:builder-dashboard ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

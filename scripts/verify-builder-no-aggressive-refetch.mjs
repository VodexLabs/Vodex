#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const gate = fs.readFileSync(
  path.join(root, "src/components/create/builder-project-gate.tsx"),
  "utf8",
);
const workspace = fs.readFileSync(
  path.join(root, "src/components/create/workspace/immersive-workspace.tsx"),
  "utf8",
);

if (gate.includes("setTimeout(r, 200)")) {
  console.error("✗ builder gate still polls every 200ms");
  process.exit(1);
}
if (!workspace.includes("setInterval(() => void poll(), 2000)")) {
  console.error("✗ immersive workspace should poll build jobs at 2s when post-build active");
  process.exit(1);
}
console.log("✓ builder polling is not aggressive");

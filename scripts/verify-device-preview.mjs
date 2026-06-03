#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const panel = fs.readFileSync(path.join(root, "src/components/create/workspace/preview-panel.tsx"), "utf8");

if (!panel.includes("1440")) errors.push("desktop viewport should use 1440px");
if (!panel.includes("768")) errors.push("tablet viewport 768");
if (!panel.includes("390")) errors.push("phone viewport 390");

if (errors.length) {
  console.error("verify:device-preview FAILED\n", errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("verify:device-preview OK");

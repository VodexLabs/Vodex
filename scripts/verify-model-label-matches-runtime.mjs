#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = fs.readFileSync(path.join(root, "src/lib/ai/model-catalog.ts"), "utf8");
const data = fs.readFileSync(path.join(root, "src/lib/data.ts"), "utf8");

if (!catalog.includes("resolveModelRuntime") || !catalog.includes("getHonestModelDisplayName")) {
  console.error("✗ model-catalog missing honest runtime resolver");
  process.exit(1);
}
if (data.includes('name: "GPT-5.4 Mini"')) {
  console.error('✗ data.ts still shows misleading "GPT-5.4 Mini" label');
  process.exit(1);
}
if (!data.includes("GPT-4o Mini")) {
  console.error("✗ data.ts must show GPT-4o Mini for standard OpenAI tier");
  process.exit(1);
}
console.log("✓ model label matches runtime mapping");

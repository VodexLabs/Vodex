#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const must = (rel, needle, label) => {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  if (!src.includes(needle)) errors.push(label);
};

must("src/lib/import/imported-app-validator.ts", "pickPreviewEntry", "entry detection");
must("src/lib/import/legacy-platform-detector.ts", "base44", "Base44 detection");
must("src/lib/import/imported-app-validator.ts", "No renderable entry", "preview blocker");

if (errors.length) {
  console.error("verify:zip-import-preview FAILED\n", errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("verify:zip-import-preview OK");

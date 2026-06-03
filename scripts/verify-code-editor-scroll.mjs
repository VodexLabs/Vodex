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

must("src/components/builder/app-builder-workspace.tsx", "overflow-hidden", "builder overflow");
must("src/components/editor/file-tree.tsx", "overflow-y-auto", "tree scroll");
must("src/components/editor/code-editor-with-lines.tsx", "overflow-auto", "editor scroll");

if (errors.length) {
  console.error("verify:code-editor-scroll FAILED\n", errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("verify:code-editor-scroll OK");

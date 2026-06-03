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
const mustNot = (rel, needle, label) => {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  if (src.includes(needle)) errors.push(`should not: ${label}`);
};

must("src/lib/publish/publish-readiness.ts", "importPreviewValidated", "import preview gate");
mustNot(
  "src/app/api/projects/[id]/publish/readiness/route.ts",
  "Missing environment variables — complete setup",
  "generic env blocker",
);

if (errors.length) {
  console.error("verify:publish-readiness FAILED\n", errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("verify:publish-readiness OK");

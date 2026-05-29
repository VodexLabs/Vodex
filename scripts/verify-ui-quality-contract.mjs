#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ui = fs.readFileSync(path.join(root, "src/lib/build/ui-quality-contract.ts"), "utf8");
const post = fs.readFileSync(path.join(root, "src/lib/build/post-build-contract.ts"), "utf8");
if (!ui.includes("PREVIEW_READY_MIN_SCORE = 85")) {
  console.error("✗ PREVIEW_READY_MIN_SCORE must be 85");
  process.exit(1);
}
if (!post.includes("uiQuality.score < PREVIEW_READY_MIN_SCORE")) {
  console.error("✗ post-build contract must enforce UI quality >= 85");
  process.exit(1);
}
console.log("✓ UI quality contract >= 85");

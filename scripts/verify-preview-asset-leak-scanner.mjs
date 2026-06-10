#!/usr/bin/env node
/** P1.3.38 — asset leak scanner module + debug command exist. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const scanner = read("src/lib/preview/scan-preview-artifact-leaks.ts");
const debug = read("scripts/debug-preview-asset-leaks.ts");
const pathScanner = read("src/lib/preview/preview-path-leak-scanner.ts");

assert(scanner.includes("scanPreviewArtifactLeaks"), "scan function");
assert(scanner.includes("formatPreviewAssetLeakReport"), "format function");
assert(scanner.includes('"stored"'), "stored phase");
assert(scanner.includes('"served"'), "served phase");
assert(debug.includes("scanPreviewArtifactLeaks"), "debug uses scanner");
assert(pathScanner.includes("preview_html_format_frame"), "format=frame pattern");
assert(pathScanner.includes("css"), "css extension in scanner");

console.log("✓ verify:preview-asset-leak-scanner");

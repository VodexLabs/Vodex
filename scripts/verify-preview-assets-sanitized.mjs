#!/usr/bin/env node
/** P1.3.38 — preview-assets route sanitizes all text bundles via bootstrap sanitizer. */
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

const route = read("src/app/api/projects/[id]/preview-assets/[...path]/route.ts");
const serve = read("src/lib/preview/serve-preview-artifact-asset.ts");

assert(route.includes("loadSanitizedPreviewArtifactAsset"), "uses shared sanitizer");
assert(serve.includes("sanitizeServedPreviewAssetText"), "sanitize helper");
assert(serve.includes("sanitizePreviewBootstrapState"), "bootstrap sanitizer");
assert(serve.includes("PREVIEW_TEXT_ASSET_EXT"), "text asset ext regex");
assert(serve.includes("css"), "css in ext pattern");
assert(serve.includes("map"), "source maps in ext pattern");
assert(serve.includes("webmanifest"), "manifest files");

console.log("✓ verify:preview-assets-sanitized");

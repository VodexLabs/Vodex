#!/usr/bin/env node
/**
 * P1.3.34 — pre-hydration location rewrite gates.
 */
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

const pre = read("src/lib/preview/inject-preview-prehydration-location-rewrite.ts");
const rewrite = read("src/lib/preview/rewrite-preview-artifact-html.ts");

assert(pre.includes("vodex-prehydration-location-rewrite"), "prehydration script id");
assert(pre.includes("__VODEX_PREVIEW_LOCATION_REWRITTEN__"), "location rewritten marker");
assert(pre.includes("preview'+'-'+'html"), "no literal preview-html poison");
assert(rewrite.includes("injectPreviewPrehydrationLocationRewrite"), "rewrite injects prehydration");
assert(rewrite.indexOf("injectPreviewPrehydrationLocationRewrite") < rewrite.indexOf("injectPreviewRouterShim"), "prehydration before router shim");

console.log("✓ verify:preview-prehydration-location-rewrite");

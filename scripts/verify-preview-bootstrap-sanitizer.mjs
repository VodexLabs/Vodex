#!/usr/bin/env node
/**
 * P1.3.33 — bootstrap sanitizer unit gates.
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

const sanitizer = read("src/lib/preview/preview-bootstrap-sanitizer.ts");
const strip = read("src/lib/preview/strip-preview-platform-paths.ts");
const rewrite = read("src/lib/preview/rewrite-preview-artifact-html.ts");
const upload = read("src/lib/imports/preview-artifact-writer.ts");
const previewHtml = read("src/app/api/projects/[id]/preview-html/route.ts");
const watchdog = read("src/lib/preview/inject-preview-inner-watchdog.ts");
const shim = read("src/lib/preview/inject-preview-virtual-history.ts");

assert(sanitizer.includes("sanitizePreviewBootstrapState"), "sanitizer core");
assert(sanitizer.includes("__NEXT_DATA__"), "NEXT_DATA handling");
assert(sanitizer.includes("__next_f"), "flight payload handling");
assert(sanitizer.includes("api%2Fprojects"), "url-encoded paths");
assert(sanitizer.includes("\\\\u002F"), "escaped unicode paths");
assert(sanitizer.includes("stripPlatformInjectionScripts"), "injection exclusion");
assert(strip.includes("sanitizePreviewBootstrapState"), "strip delegates to sanitizer");
assert(rewrite.includes("stripPreviewPlatformPathsFromText"), "rewrite sanitizes before inject");
assert(upload.includes("sanitizePreviewBootstrapState"), "upload-time sanitize");
assert(previewHtml.includes("assertPreviewBootstrapClean"), "serve-time assertion");
assert(previewHtml.includes("buildPreviewBootstrapLeakPanel"), "leak diagnostic panel");
assert(!watchdog.includes("preview-html") || watchdog.includes("preview'+'-'+'html"), "watchdog obfuscates preview-html literal");
assert(!shim.includes("preview-html") || shim.includes("preview'+'-'+'html"), "shim obfuscates preview-html literal");

console.log("✓ verify:preview-bootstrap-sanitizer");

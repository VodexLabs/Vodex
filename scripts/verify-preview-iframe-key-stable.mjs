#!/usr/bin/env node
/** P1.3.37 — iframe dom key stable across cache bust / poll refresh. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const resolver = fs.readFileSync(
  path.join(root, "src/lib/preview/preview-iframe-url-resolver.ts"),
  "utf8",
);
const panel = fs.readFileSync(
  path.join(root, "src/components/create/workspace/preview-panel.tsx"),
  "utf8",
);

const domKeyFn = resolver.slice(resolver.indexOf("export function previewIframeDomKey"));
assert(domKeyFn.includes("reloadKey"), "dom key includes reloadKey");
assert(!domKeyFn.includes("cacheBust"), "dom key excludes cacheBust");
assert(!domKeyFn.includes("normalizedSrc"), "dom key excludes normalizedSrc");
assert(panel.includes("previewIframeDomKey({"), "panel uses stable dom key");
assert(!panel.includes("cacheBust: urlResolution?.cacheBust"), "panel does not pass cacheBust to dom key");

console.log("✓ verify:preview-iframe-key-stable");

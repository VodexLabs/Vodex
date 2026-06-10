#!/usr/bin/env npx tsx
/**
 * P1.3.34 — prehydration must appear before Next scripts in served HTML.
 */
import { rewritePreviewArtifactHtml } from "../src/lib/preview/rewrite-preview-artifact-html";

const fixture = `<!DOCTYPE html><html><head><script src="/_next/static/chunks/main.js"></script></head><body><div id="__next"></div></body></html>`;

const out = rewritePreviewArtifactHtml(
  fixture,
  "00000000-0000-4000-8000-000000000001",
  "build1",
  "/",
);

const preIdx = out.indexOf("vodex-prehydration-location-rewrite");
const nextIdx = out.indexOf("_next/static/chunks/main.js");
if (preIdx < 0 || nextIdx < 0 || preIdx > nextIdx) {
  console.error("✗ prehydration script not before Next chunk in served HTML");
  console.error(out.slice(0, 500));
  process.exit(1);
}
console.log("✓ verify:preview-rewrite-before-next-scripts");

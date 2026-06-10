#!/usr/bin/env node
/** P1.3.34 — inner Next 404 prevention stack present. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const checks = [
  ["prehydration", read("src/lib/preview/inject-preview-prehydration-location-rewrite.ts").includes("__VODEX_PREVIEW_LOCATION_REWRITTEN__")],
  ["rewrite order", read("src/lib/preview/rewrite-preview-artifact-html.ts").includes("injectPreviewPrehydrationLocationRewrite")],
  ["virtual runtime", fs.existsSync(path.join(root, "src/app/preview-runtime/[projectId]/[artifactId]/[[...path]]/route.ts"))],
  ["error panel copy", read("src/components/preview/preview-inner-route-error-panel.tsx").includes("booted on the preview proxy path")],
];

for (const [name, ok] of checks) {
  if (!ok) {
    console.error(`✗ verify:inner-next-404-fixed — ${name}`);
    process.exit(1);
  }
}
console.log("✓ verify:inner-next-404-fixed");

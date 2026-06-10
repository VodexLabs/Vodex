#!/usr/bin/env node
/** P1.3.35 — preview-runtime / preview-html routes apply embed-safe frame headers. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const embedModule = fs.readFileSync(
  path.join(root, "src/lib/preview/preview-iframe-embed-headers.ts"),
  "utf8",
);
assert(embedModule.includes("mergePreviewIframeEmbedHeaders"), "embed header helper exists");
assert(embedModule.includes("frame-ancestors 'self'"), "CSP allows same-origin iframe");

const routes = [
  "src/app/preview-runtime/[projectId]/[artifactId]/[[...path]]/route.ts",
  "src/app/api/projects/[id]/preview-html/route.ts",
  "src/app/api/projects/[id]/preview-assets/[...path]/route.ts",
];

for (const rel of routes) {
  const abs = path.join(root, rel);
  assert(fs.existsSync(abs), `${rel} exists`);
  const src = fs.readFileSync(abs, "utf8");
  assert(
    src.includes("mergePreviewIframeEmbedHeaders"),
    `${rel} must merge preview iframe embed headers`,
  );
  assert(!src.includes('"X-Frame-Options": "DENY"'), `${rel} must not emit DENY`);
}

const rewrite = fs.readFileSync(
  path.join(root, "src/lib/preview/rewrite-preview-artifact-html.ts"),
  "utf8",
);
assert(rewrite.includes("stripIframeBlockingMetaFromHtml"), "artifact rewrite strips blocking meta");

console.log("✓ verify:preview-runtime-frame-headers");

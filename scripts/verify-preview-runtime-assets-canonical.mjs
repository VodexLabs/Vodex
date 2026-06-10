#!/usr/bin/env node
/** P1.3.38 — HTML rewrite uses canonical preview-runtime asset URLs. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rewritePreviewArtifactHtml } from "../src/lib/preview/rewrite-preview-artifact-html.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const rewriteSrc = read("src/lib/preview/rewrite-preview-artifact-html.ts");
const runtimeRoute = read("src/app/preview-runtime/[projectId]/[artifactId]/assets/[...path]/route.ts");

assert(rewriteSrc.includes("buildPreviewRuntimeAssetUrl"), "runtime asset url builder");
assert(runtimeRoute.includes("loadSanitizedPreviewArtifactAsset"), "runtime assets route");

const projectId = "30066b29-15fa-41cf-9a6e-4111418be3e5";
const buildId = "267e0278-d333-41e8-82ef-f8c309749df8";
const sample = `<!DOCTYPE html><html><head>
<link rel="stylesheet" crossorigin href="/assets/index-dead.css">
</head><body>
<script type="module" crossorigin src="/assets/index-beef.js"></script>
</body></html>`;

const out = rewritePreviewArtifactHtml(sample, projectId, buildId);
const expected = `/preview-runtime/${encodeURIComponent(projectId)}/${encodeURIComponent(buildId)}/assets/assets/index-beef.js`;

assert(out.includes(expected), `script src not rewritten to preview-runtime: ${out.slice(0, 400)}`);
assert(!out.includes("/api/projects/") || !out.includes("/preview-assets/"), "no legacy preview-assets in rewrite output");
assert(!out.includes('href="/assets/'), "unrewritten absolute asset path remains");

console.log("✓ verify:preview-runtime-assets-canonical");

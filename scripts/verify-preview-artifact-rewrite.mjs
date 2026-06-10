#!/usr/bin/env node
import { rewritePreviewArtifactHtml } from "../src/lib/preview/rewrite-preview-artifact-html.ts";

const projectId = "proj-1";
const buildId = "job-abc";
const sample = `<!DOCTYPE html><html><head>
<link rel="stylesheet" crossorigin href="/assets/index-dead.css">
</head><body>
<script type="module" crossorigin src="/assets/index-beef.js"></script>
</body></html>`;

const out = rewritePreviewArtifactHtml(sample, projectId, buildId);
const expected = `/preview-runtime/${encodeURIComponent(projectId)}/${encodeURIComponent(buildId)}/assets/assets/index-beef.js`;
if (!out.includes(expected)) {
  throw new Error("script src not rewritten to preview-runtime asset path");
}
if (out.includes('href="/assets/')) {
  throw new Error("unrewritten absolute asset path remains");
}

console.log("verify:preview-artifact-rewrite OK");

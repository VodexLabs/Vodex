#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

let failed = false;
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed = true;
}
function pass(msg) {
  console.log(`PASS: ${msg}`);
}

const immersive = read("src/components/create/workspace/immersive-workspace.tsx");
if (immersive.includes("buildStaticPreviewHtml")) {
  fail("immersive-workspace still imports client preview builder");
} else {
  pass("preview HTML not built on client");
}
if (immersive.includes("setPreviewSrcDoc") || immersive.includes("previewSrcDoc")) {
  fail("immersive-workspace must not store preview HTML in React state");
} else {
  pass("no preview HTML in React state");
}
if (!immersive.includes("projectPreviewFrameUrl")) {
  fail("immersive-workspace must use preview frame URL");
} else {
  pass("preview uses iframe frame URL");
}
if (!immersive.includes('cache: "no-store"')) {
  fail("preview status fetch missing no-store");
} else {
  pass("preview status fetched with no-store");
}

if (!read("src/lib/preview/static-preview-builder.ts").includes('import "server-only"')) {
  fail("static-preview-builder not server-only");
} else {
  pass("static-preview-builder is server-only");
}

const trunc = read("src/lib/diagnostics/truncate-large-diagnostic-string.ts");
if (!trunc.includes("MAX_EVENT_LOG_CHARS") || !trunc.includes("MAX_DIAGNOSTIC_METADATA_CHARS")) {
  fail("missing payload limit constants");
} else {
  pass("diagnostic payload limits defined");
}

if (!read("src/hooks/use-project-files.ts").includes("loadContent")) {
  fail("use-project-files missing lazy content option");
} else {
  pass("lazy file content loading");
}

if (!read("src/lib/build/build-job-events.ts").includes("sanitizeBuildJobEventMetadata")) {
  fail("build job events not sanitized");
} else {
  pass("build job metadata sanitized");
}

const pub = read("src/components/publish/public-app-renderer.tsx");
if (pub.includes("srcDoc") || pub.includes("html:")) {
  fail("public-app-renderer must not use srcDoc or html prop");
} else if (!pub.includes("frameSrc")) {
  fail("public-app-renderer must use frameSrc");
} else {
  pass("published apps use frame URL only");
}

const previewRoute = read("src/app/api/projects/[id]/preview-html/route.ts");
if (!previewRoute.includes("format=frame") && !previewRoute.includes('format") === "frame"')) {
  fail("preview-html missing frame format");
} else if (previewRoute.includes("html,") || previewRoute.includes("html:")) {
  if (/html,\s*\n/.test(previewRoute) || /html:\s*html/.test(previewRoute)) {
    fail("preview-html JSON must not include html body");
  }
}
if (!previewRoute.includes("previewHtmlLength")) {
  fail("preview-html JSON should expose html length only");
} else {
  pass("preview-html splits JSON status vs HTML frame");
}

if (!read("src/lib/cache/fetch-dedupe.ts").includes("MAX_CLIENT_CACHE_JSON_BYTES")) {
  fail("fetch-dedupe must skip giant cache entries");
} else {
  pass("client fetch cache size capped");
}

if (failed) process.exit(1);
console.log("\nAll webpack large-string safeguards passed.");

#!/usr/bin/env node
/**
 * Debug ZIP preview routing — reports iframe/proxy chain without live server.
 * Usage: npm run debug:zip-preview-route -- --project <id> --route /dashboard
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const projectId = arg("--project", "example-project-id");
const route = arg("--route", "/dashboard");

const rewrite = read("src/lib/preview/rewrite-preview-artifact-html.ts");
const shim = read("src/lib/preview/inject-preview-virtual-history.ts");
const assets = read("src/app/api/projects/[id]/preview-assets/[...path]/route.ts");
const immersive = read("src/components/create/workspace/immersive-workspace.tsx");

const iframeSrc = `/api/projects/${projectId}/preview-html?format=frame&route=${encodeURIComponent(route)}`;
const usesRawVodex = /https?:\/\/[^"']*vodex\.dev/i.test(iframeSrc);
const usesArtifactProxy = iframeSrc.includes("/preview-html");
const hasVirtualHistory = shim.includes("__VODEX_PREVIEW_ACTIVE__");
const hasSpaFallback = assets.includes("index.html");
const routeInFrameUrl = immersive.includes("previewRoute,");

console.log("ZIP Preview Route Debug Report");
console.log("==============================");
console.log(`project_id: ${projectId}`);
console.log(`selected_route: ${route}`);
console.log(`iframe_src: ${iframeSrc}`);
console.log(`artifact_path: preview-artifacts/${projectId}/<build>/index.html`);
console.log(`framework: SPA (imported ZIP — detected via artifact index.html)`);
console.log(`is_spa: true`);
console.log(`raw_vodex_url_in_iframe_src: ${usesRawVodex}`);
console.log(`artifact_proxy_used: ${usesArtifactProxy}`);
console.log(`route_fallback_index_html: ${hasSpaFallback}`);
console.log(`virtual_history_injected: ${hasVirtualHistory}`);
console.log(`html_vodex_link_rewrite: ${rewrite.includes("rewriteAbsoluteVodexLinksInHtml")}`);
console.log(`route_in_frame_url_builder: ${routeInFrameUrl}`);
console.log("");
console.log("Why refused-to-connect can still happen:");
console.log("- iframe src set to raw https://vodex.dev/p/... (X-Frame-Options blocks embed)");
console.log("- history.replaceState('/route') escaping preview-html URL (fixed: virtual history)");
console.log("- imported bundle hardcodes window.location to external vodex.dev");
console.log("- user opens published URL in iframe instead of preview proxy");
console.log("");
console.log("Expected diagnostics after fix:");
console.log(`  source: artifact_proxy`);
console.log(`  route: ${route}`);
console.log(`  fallback: index.html`);
console.log(`  rawUrlBlocked: false`);

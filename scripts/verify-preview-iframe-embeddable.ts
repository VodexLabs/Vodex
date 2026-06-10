#!/usr/bin/env npx tsx
/** P1.3.35 — preview iframe embeddability module + diagnostics fields. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeIframeEmbeddabilityFromHeaders,
  mergePreviewIframeEmbedHeaders,
  scanHtmlForIframeBlockingMeta,
  stripIframeBlockingMetaFromHtml,
} from "../src/lib/preview/preview-iframe-embed-headers";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const diagSrc = fs.readFileSync(
  path.join(root, "src/lib/preview/build-preview-diagnostics-report.ts"),
  "utf8",
);
const panelSrc = fs.readFileSync(
  path.join(root, "src/components/create/workspace/preview-panel.tsx"),
  "utf8",
);

assert(diagSrc.includes("iframe_embeddable"), "diagnostics report includes iframe_embeddable");
assert(diagSrc.includes("probePreviewIframeEmbeddability"), "diagnostics probes iframe headers");
assert(panelSrc.includes("Copy headers"), "preview panel exposes copy headers action");
assert(panelSrc.includes("analyzeIframeEmbeddabilityFromHeaders"), "preview panel probes live headers");

const safe = analyzeIframeEmbeddabilityFromHeaders(mergePreviewIframeEmbedHeaders());
assert(safe.iframe_embeddable === true, "platform preview headers allow same-origin embed");

const deny = analyzeIframeEmbeddabilityFromHeaders({ "X-Frame-Options": "DENY" });
assert(deny.iframe_embeddable === false, "DENY detected");
assert(deny.iframe_block_reason?.includes("DENY"), "DENY reason string");

const cspBlock = analyzeIframeEmbeddabilityFromHeaders({
  "Content-Security-Policy": "frame-ancestors 'none'",
});
assert(cspBlock.iframe_embeddable === false, "CSP frame-ancestors none blocks embed");

const metaBlocked = scanHtmlForIframeBlockingMeta(
  '<meta http-equiv="X-Frame-Options" content="DENY">',
);
assert(metaBlocked.blocked === true, "HTML meta XFO detected");

const stripped = stripIframeBlockingMetaFromHtml(
  '<head><meta http-equiv="X-Frame-Options" content="DENY"><title>x</title></head>',
);
assert(!/x-frame-options/i.test(stripped), "strip removes blocking meta");

console.log("✓ verify:preview-iframe-embeddable");

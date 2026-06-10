#!/usr/bin/env node
/** P1.3.38 — clear cache triggers SW/cache deep clean inside iframe. */
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

const pre = read("src/lib/preview/inject-preview-prehydration-location-rewrite.ts");
const panel = read("src/components/create/workspace/preview-panel.tsx");
const post = read("src/lib/preview/post-preview-iframe-deep-clean.ts");

assert(pre.includes("vodex-preview-deep-clean"), "deep clean message handler");
assert(pre.includes("serviceWorker.getRegistrations"), "unregister SW");
assert(pre.includes("caches.keys"), "clear CacheStorage");
assert(post.includes("postPreviewIframeDeepClean"), "post helper");
assert(panel.includes("postPreviewIframeDeepClean"), "panel uses deep clean");

console.log("✓ verify:clear-cache-removes-sw-and-caches");

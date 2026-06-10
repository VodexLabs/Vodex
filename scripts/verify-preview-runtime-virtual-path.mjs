#!/usr/bin/env node
/** P1.3.34 — virtual preview-runtime route exists (fallback path). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = path.join(root, "src/app/preview-runtime/[projectId]/[artifactId]/[[...path]]/route.ts");

if (!fs.existsSync(route)) {
  console.error("✗ preview-runtime route missing at", route);
  process.exit(1);
}
const src = fs.readFileSync(route, "utf8");
const resolver = fs.readFileSync(path.join(root, "src/lib/preview/preview-iframe-url-resolver.ts"), "utf8");
const internal = fs.readFileSync(path.join(root, "src/lib/preview/internal-preview-url.ts"), "utf8");
if (!src.includes("rewritePreviewArtifactHtml")) {
  console.error("✗ preview-runtime must serve rewritten artifact HTML");
  process.exit(1);
}
if (!resolver.includes("buildVirtualPreviewRuntimeUrl") || !internal.includes("buildVirtualPreviewRuntimeUrl")) {
  console.error("✗ virtual preview runtime URL not wired in resolver");
  process.exit(1);
}
console.log("✓ verify:preview-runtime-virtual-path");

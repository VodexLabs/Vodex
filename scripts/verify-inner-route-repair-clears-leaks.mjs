#!/usr/bin/env node
/**
 * P1.3.33 — repair module must sanitize, rebuild, and verify leaks.
 */
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

const repair = read("src/lib/preview/preview-inner-route-repair.ts");
const route = read("src/app/api/projects/[id]/preview/inner-route-repair/route.ts");

assert(repair.includes("sanitizePreviewBootstrapState"), "repair uses bootstrap sanitizer");
assert(repair.includes("verifyStoredArtifactBootstrapClean"), "post-repair verification");
assert(repair.includes("rewritePreviewArtifactHtml"), "served HTML verification");
assert(repair.includes("runProjectPreviewBuild"), "rebuild after sanitize");
assert(route.includes("repairPreviewInnerRoute"), "repair API wired");

console.log("✓ verify:inner-route-repair-clears-leaks");

#!/usr/bin/env node
/** P1.3.35 — production readiness uses --project / READINESS_PROJECT_ID, not hardcoded UUID. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const validation = fs.readFileSync(
  path.join(root, "scripts/lib/production-validation.mjs"),
  "utf8",
);
const report = fs.readFileSync(
  path.join(root, "scripts/production-readiness-report.mjs"),
  "utf8",
);
const fetchDiag = fs.readFileSync(
  path.join(root, "scripts/lib/fetch-preview-diagnostics.ts"),
  "utf8",
);
const extract = fs.readFileSync(
  path.join(root, "scripts/lib/extract-json-object.mjs"),
  "utf8",
);

assert(validation.includes("resolveProjectId"), "production-validation exports resolveProjectId");
assert(validation.includes("READINESS_PROJECT_ID"), "READINESS_PROJECT_ID env supported");
assert(!validation.includes("ff55c353-aabf-479a-aaec-2138bba9d6b4"), "hardcoded ff55 project removed");
assert(report.includes("resolveProjectId"), "readiness report uses resolveProjectId");
assert(fetchDiag.includes("resolveDiagnosticsProjectId"), "fetch diagnostics resolves project id");
assert(fetchDiag.includes("iframe_embeddable"), "PASS rule includes iframe_embeddable");
assert(extract.includes("iframe_embeddable"), "extract-json PASS includes iframe_embeddable");

console.log("✓ verify:production-readiness-project-arg");

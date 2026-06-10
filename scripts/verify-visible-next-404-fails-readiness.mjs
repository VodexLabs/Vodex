#!/usr/bin/env node
/** P1.3.38 — visible Next 404 / boot asset leaks fail diagnostics PASS. */
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

const report = read("src/lib/preview/build-preview-diagnostics-report.ts");
const fetch = read("scripts/lib/fetch-preview-diagnostics.ts");

assert(report.includes("visible_next_404_detected"), "visible 404 field");
assert(report.includes("boot_asset_leak_count"), "boot asset leak count");
assert(report.includes("bad_inner_route_visible"), "bad inner route field");
assert(fetch.includes("boot_asset_leak_count"), "PASS gate checks leaks");
assert(fetch.includes("visible_next_404_detected"), "PASS gate checks visible 404");

console.log("✓ verify:visible-next-404-fails-readiness");

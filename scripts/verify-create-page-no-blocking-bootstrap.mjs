#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = fs.readFileSync(path.join(root, "src/components/create/create-workspace-entry.tsx"), "utf8");

const errors = [];
if (!entry.includes("BOOTSTRAP_TIMEOUT_MS = 5_000")) {
  errors.push("bootstrap must use 5s timeout");
}
if (!entry.includes("fetchWithTimeout")) errors.push("missing fetchWithTimeout");
if (entry.includes("for (let i = 0; i < 25; i++)") && !entry.includes("BOOTSTRAP_TIMEOUT_MS")) {
  errors.push("unbounded project ready poll");
}
if (!entry.includes("!needsRedirectBootstrap")) {
  errors.push("must render shell without redirect bootstrap");
}
if (entry.match(/await assertProjectReady[\s\S]*?if \(!needsRedirectBootstrap/)) {
  /* ok */
} else if (entry.includes("assertProjectReady") && !entry.includes("needsRedirectBootstrap")) {
  errors.push("assertProjectReady should only run in redirect bootstrap path");
}

if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}
console.log("✓ create page bootstrap is bounded and non-blocking for plain /create");

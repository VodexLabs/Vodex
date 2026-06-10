#!/usr/bin/env node
/** P1.3.37 — runtime poll enabled for ZIP imports without app_files rows. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const immersive = fs.readFileSync(
  path.join(root, "src/components/create/workspace/immersive-workspace.tsx"),
  "utf8",
);
const pollHelper = fs.readFileSync(
  path.join(root, "src/lib/preview/should-poll-preview-runtime.ts"),
  "utf8",
);

assert(pollHelper.includes("shouldPollPreviewRuntime"), "poll helper exists");
assert(pollHelper.includes("isZipImportProject"), "poll helper checks zip import");
assert(immersive.includes("shouldPollPreviewRuntime"), "immersive uses poll helper");
assert(!immersive.includes("projectFiles.length === 0) {\n      setPreviewRuntime(null)"), "removed hard block on empty app_files");
assert(!/if \(!effectiveProjectId \|\| projectFiles\.length === 0\)/.test(immersive), "no poll skip solely on projectFiles.length === 0");

console.log("✓ verify:preview-runtime-polls-for-zip-without-app-files");

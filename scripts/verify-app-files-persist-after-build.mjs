#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function mustInclude(file, needles) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  for (const n of needles) {
    if (!text.includes(n)) errors.push(`${file} missing ${n}`);
  }
}

mustInclude("src/lib/build/assert-build-files-persisted.ts", [
  "assertBuildFilesPersisted",
  "files_persistence_failed",
  "main_route_empty",
]);
mustInclude("src/lib/build/execute-staged-build-job.ts", [
  "assertBuildFilesPersisted",
  "startPreviewSession",
  "files_persistence_failed",
]);
mustInclude("src/lib/build/persist-generated-files.ts", ["app_files", "upsert"]);

const r = spawnSync("npx", ["tsx", path.join(root, "scripts/lib/verify-p06-files-run.ts")], {
  cwd: root,
  shell: true,
  encoding: "utf8",
});
if (r.status !== 0) {
  errors.push(`scaffold run: ${(r.stderr || r.stdout || "").trim()}`);
}

if (errors.length) {
  console.error("verify:app-files-persist-after-build FAILED");
  errors.forEach((e) => console.error(" ✗", e));
  process.exit(1);
}
console.log("verify:app-files-persist-after-build OK");

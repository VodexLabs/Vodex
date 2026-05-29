#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync("npx", ["tsx", path.join(root, "scripts/lib/verify-p06-preview-run.ts")], {
  cwd: root,
  shell: true,
  encoding: "utf8",
});

if (r.status !== 0) {
  console.error("verify:preview-renders-restaurant-app FAILED");
  console.error((r.stderr || r.stdout || "").trim());
  process.exit(1);
}
console.log("verify:preview-renders-restaurant-app OK");

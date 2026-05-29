#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync("npx", ["tsx", path.join(root, "scripts/lib/verify-credit-reservations-run.ts")], {
  cwd: root,
  shell: true,
  encoding: "utf8",
  stdio: "inherit",
});
process.exit(r.status ?? 1);

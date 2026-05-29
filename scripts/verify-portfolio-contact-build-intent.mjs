#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync("node", ["scripts/verify-build-intent-portfolio.mjs"], {
  cwd: root,
  stdio: "inherit",
});
process.exit(r.status ?? 1);

#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync(
  process.execPath,
  ["scripts/verify-p08-production.mjs", "owner-diagnostics-center-left-modal"],
  { cwd: root, stdio: "inherit" },
);
process.exit(r.status ?? 1);

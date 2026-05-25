#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
spawnSync("node", ["scripts/verify-mobile-wrapper-entitlements.mjs"], { cwd: root, stdio: "inherit" });

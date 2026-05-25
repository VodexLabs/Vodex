#!/usr/bin/env node
/** Reuse existing provider cost client verify. */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync("node", ["scripts/verify-no-provider-cost-client.mjs"], { cwd: root, stdio: "inherit" });
process.exit(r.status ?? 1);

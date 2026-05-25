#!/usr/bin/env node
/** Full environment doctor — port, TLS, schema (no provider calls). */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { diagnoseDevServer, devServerBaseUrl } from "./lib/dev-server.mjs";
import { formatElapsed } from "./lib/verify-runner.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const start = Date.now();

console.log("\n=== doctor:full ===\n");

function run(label, cmd) {
  console.log(`\n--- ${label} ---`);
  const r = spawnSync(cmd, { cwd: root, shell: true, stdio: "inherit", env: process.env });
  return r.status ?? 1;
}

const diag = await diagnoseDevServer(devServerBaseUrl());
console.log(`Dev server: ${diag.state} — ${diag.message}`);
if (diag.pid) console.log(`  PID: ${diag.pid}`);

let failed = false;
if (run("verify:tls", "npm run verify:tls") !== 0) failed = true;
if (run("verify:runtime-schema-contract", "npm run verify:runtime-schema-contract") !== 0) failed = true;
if (run("typecheck", "npm run typecheck") !== 0) failed = true;

console.log(`\n=== doctor:full ${failed ? "FAILED" : "PASSED"} in ${formatElapsed(Date.now() - start)} ===\n`);
process.exit(failed ? 1 : 0);

#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const env = {
  ...process.env,
  NODE_USE_SYSTEM_CA: process.env.NODE_USE_SYSTEM_CA ?? "1",
  PLAYWRIGHT_SKIP_SERVER: "1",
  DREAMOS_INLINE_ASYNC_BUILD: "1",
  E2E_RUN_LIVE: "1",
};

console.log("\n=== e2e:restaurant:enqueue-smoke ===\n");
const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
spawnSync(
  `curl.exe -s -o NUL -w "%{http_code}" "${base}/create?mode=build&strategy=build_now"`,
  { cwd: root, shell: true, stdio: "inherit" },
);
console.log("[warm] /create warmed\n");
const r = spawnSync(
  "npx",
  [
    "playwright",
    "test",
    "tests/e2e/restaurant-build-enqueue-smoke.spec.ts",
    "--grep",
    "@enqueue",
    "--timeout=90000",
    "--reporter=line",
  ],
  { cwd: root, shell: true, stdio: "inherit", env },
);
process.exit(r.status ?? 1);

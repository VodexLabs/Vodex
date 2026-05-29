#!/usr/bin/env node
/**
 * Targeted restaurant queue E2E — requires warm dev on :3000, finishes in ~90s.
 */
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { diagnoseDevServer } from "./lib/dev-server.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUEUE_ONLY_MARKER = path.join(root, "tests/e2e/evidence/.e2e-queue-only-passed.json");

console.log("\n=== e2e:restaurant:queue-only ===\n");

const diag = await diagnoseDevServer();
if (diag.state !== "healthy") {
  console.error(`✗ Dev server not healthy: ${diag.message}`);
  console.error("  Start npm run dev and wait for /api/dev/ping before queue-only.\n");
  process.exit(1);
}

const env = {
  ...process.env,
  PLAYWRIGHT_SKIP_SERVER: "1",
  E2E_RUN_LIVE: "1",
  PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
};

const r = spawnSync(
  "npx",
  [
    "playwright",
    "test",
    "tests/e2e/restaurant-queue-only.spec.ts",
    "--grep",
    "@queue",
    "--workers=1",
    "--timeout=135000",
    "--reporter=line",
  ],
  { cwd: root, shell: true, stdio: "inherit", env },
);

if ((r.status ?? 1) === 0) {
  fs.mkdirSync(path.dirname(QUEUE_ONLY_MARKER), { recursive: true });
  fs.writeFileSync(
    QUEUE_ONLY_MARKER,
    JSON.stringify({ passedAt: new Date().toISOString() }, null, 2),
  );
}
process.exit(r.status ?? 1);

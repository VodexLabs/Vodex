#!/usr/bin/env node
/**
 * P1.3.6 — Prove stable server recovery + zip-import after simulated post-build unhealthy state.
 */
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { killPortProcessSafely, portHolderPid } from "./lib/dev-server.mjs";
import {
  STABLE_BASE_URL,
  acquireStableDevServer,
  recoverBetweenSteps,
  stopRunnerDevServer,
} from "./lib/stable-live-server.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(root, "artifacts", "benchmarks", "p13", "stable-server-recovery.json");

process.env.E2E_RUN_LIVE = "1";
process.env.VODEX_ALLOW_RESTART_REUSED_DEV = "1";

async function main() {
  console.log("\n=== verify:stable-server-recovery ===\n");

  let serverState = await acquireStableDevServer(root);
  const oldPid = portHolderPid(3000) ?? serverState.pid;
  console.log(`Initial server PID ${oldPid} (runner_started=${serverState.startedByRunner})`);

  console.log("\nSimulating post-build unhealthy state (kill dev listener)…");
  killPortProcessSafely(3000);
  await new Promise((r) => setTimeout(r, 3000));

  const { serverState: recovered, event } = await recoverBetweenSteps(
    "simulated:post-live-generated-app",
    serverState,
    root,
  );
  serverState = recovered;

  if (!event?.success) {
    console.error("✗ Recovery did not restore health");
    process.exit(1);
  }

  console.log(`✓ Recovery succeeded: ${event.old_pid} → ${event.new_pid} (${event.downtime_ms}ms)`);

  console.log("\nRunning live:zip-import after recovery…");
  const zip = spawnSync("npm", ["run", "verify:zip-import-live-route"], {
    cwd: root,
    shell: true,
    encoding: "utf8",
    env: {
      ...process.env,
      E2E_BASE_URL: STABLE_BASE_URL,
      PLAYWRIGHT_BASE_URL: STABLE_BASE_URL,
      VODEX_REUSE_DEV_SERVER: "1",
      NODE_USE_SYSTEM_CA: process.env.NODE_USE_SYSTEM_CA ?? "1",
    },
    timeout: 180_000,
  });

  if (zip.stdout) process.stdout.write(zip.stdout);
  if (zip.stderr) process.stderr.write(zip.stderr);

  const result = {
    capturedAt: new Date().toISOString(),
    pass: zip.status === 0,
    recovery: event,
    zip_exit_code: zip.status ?? 1,
    old_pid: oldPid,
    new_pid: serverState.pid,
  };

  const fs = await import("node:fs");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

  stopRunnerDevServer(serverState, root);

  if (zip.status !== 0) {
    console.error("\n✗ verify:stable-server-recovery failed at zip-import\n");
    process.exit(1);
  }

  console.log(`\n✓ verify:stable-server-recovery passed`);
  console.log(`Artifact: ${outPath}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

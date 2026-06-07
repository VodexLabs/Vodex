#!/usr/bin/env node
/**
 * Diagnose localhost:3000 — port, PID, HTTP probes, memory, safe restart.
 * npm run doctor:dev-server
 * npm run doctor:dev-server -- --restart-if-unhealthy
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assessDevServerRestartSafety,
  devServerBaseUrl,
  diagnoseDevServer,
  formatMemory,
  getProcessCommandLine,
  killPortProcessSafely,
  portHolderPid,
  probeHealthEndpoints,
  READINESS_TIMEOUT_MS,
} from "./lib/dev-server.mjs";
import { startFreshStableDevServer } from "./lib/stable-live-server.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const restartIfUnhealthy = process.argv.includes("--restart-if-unhealthy");

console.log("\n=== doctor:dev-server ===\n");

const base = devServerBaseUrl();
const pid = portHolderPid(3000);

console.log(`Expected base URL: ${base}`);
console.log(`Readiness timeout:   ${READINESS_TIMEOUT_MS / 1000}s (verify scripts)`);
console.log(`Port 3000 status:    ${pid ? `LISTENING (PID ${pid})` : "not listening"}\n`);

if (pid) {
  const cmd = getProcessCommandLine(pid);
  console.log(`Process command:     ${cmd ?? "(unavailable)"}`);
}

const endpoints = await probeHealthEndpoints(base, 8_000);
console.log("\n/api/health:");
console.log(`  ok:     ${endpoints.health.ok}`);
console.log(`  status: ${endpoints.health.status ?? "n/a"}`);
if (endpoints.health.error) console.log(`  error:  ${endpoints.health.error}`);
if (endpoints.health.body) {
  console.log(`  app:    ${endpoints.health.body.app ?? "n/a"}`);
}

console.log("\n/api/dev/ping:");
console.log(`  ok:     ${endpoints.ping.ok}`);
console.log(`  status: ${endpoints.ping.status ?? "n/a"}`);
if (endpoints.ping.error) console.log(`  error:  ${endpoints.ping.error}`);

const diag = await diagnoseDevServer(base);
console.log(`\nOverall state: ${diag.state}`);
console.log(`${diag.message}\n`);

const safety = assessDevServerRestartSafety(pid);
console.log("Restart safety:");
console.log(`  safe:   ${safety.safe}`);
console.log(`  reason: ${safety.reason}`);
if (safety.memoryBytes != null) {
  console.log(`  memory: ${formatMemory(safety.memoryBytes)}`);
}

const healthy = endpoints.healthy || diag.state === "healthy";

console.log("\nRecommendation:");
if (healthy) {
  console.log("  ✓ Dev server is healthy. No action needed.");
} else if (safety.safe) {
  console.log("  Server is unhealthy but safe to restart (Node Vodex dev process).");
  console.log("  Run: npm run doctor:dev-server -- --restart-if-unhealthy");
  console.log("  Or:  npm run clean:next && npm run dev");
} else if (pid && !safety.safe) {
  console.log(`  ✗ Port held by non-Vodex or unknown process (PID ${pid}).`);
  console.log("  Stop that process manually before starting npm run dev.");
} else if (diag.state === "down") {
  console.log("  1. npm run dev");
  console.log("  2. npm run verify:server");
} else {
  console.log("  1. npm run clean:next");
  console.log("  2. npm run dev");
}

if (restartIfUnhealthy && !healthy) {
  console.log("\n--- restart-if-unhealthy ---\n");
  if (!safety.safe) {
    console.error(`✗ Cannot restart safely: ${safety.reason}`);
    if (safety.command) console.error(`  Command: ${safety.command}`);
    process.exit(1);
  }

  if (pid) {
    console.log(`Killing PID ${pid}…`);
    const kill = killPortProcessSafely(3000);
    if (!kill.killed) {
      console.error(`✗ Failed to kill PID ${pid}: ${kill.reason ?? "unknown"}`);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log("Starting fresh dev server…");
  try {
    const state = await startFreshStableDevServer(root, base);
    console.log(`✓ Dev server healthy (PID ${state.pid}, mode ${state.ownershipMode})`);
    console.log("\nPress Ctrl+C to stop the doctor-started server.\n");
    process.exit(0);
  } catch (err) {
    console.error("✗ Restart failed:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

console.log("");
process.exit(healthy ? 0 : 1);

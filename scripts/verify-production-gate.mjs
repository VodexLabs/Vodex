#!/usr/bin/env node
/**
 * Production readiness gate — deterministic, no benchmarks, no provider API calls.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withSafeTlsEnv } from "./lib/tls-env.mjs";
import { runStep, formatElapsed } from "./lib/verify-runner.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const verifyEnv = withSafeTlsEnv({ ...process.env });
delete verifyEnv.E2E_RUN_LIVE;
delete verifyEnv.BENCHMARK_LIVE;

const steps = [
  ["verify:tls", "npm run verify:tls"],
  ["verify:auth-session", "npm run verify:auth-session"],
  ["verify:runtime-schema-contract", "npm run verify:runtime-schema-contract"],
  ["verify:billing-schema-gate", "npm run verify:billing-schema-gate"],
  ["verify:credit-truth", "npm run verify:credit-truth"],
  ["verify:credit-display", "npm run verify:credit-display"],
  ["verify:model-orchestration", "npm run verify:model-orchestration"],
  ["verify:ai-provider-fallback", "npm run verify:ai-provider-fallback"],
  ["verify:chat", "npm run verify:chat"],
  ["verify:chat-persistence", "npm run verify:chat-persistence"],
  ["verify:chat-routing", "npm run verify:chat-routing"],
  ["verify:chat-send-latency", "npm run verify:chat-send-latency"],
  ["verify:navigation-reliability", "npm run verify:navigation-reliability"],
  ["verify:performance", "npm run verify:performance"],
  ["verify:slow-routes", "npm run verify:slow-routes"],
  ["verify:loading-states", "npm run verify:loading-states"],
  ["verify:create-flow", "npm run verify:create-flow"],
  ["verify:create-routing", "npm run verify:create-routing"],
  ["verify:project-dashboard", "npm run verify:project-dashboard"],
  ["verify:builder-dashboard", "npm run verify:builder-dashboard"],
  ["verify:zip-import", "npm run verify:zip-import"],
  ["verify:imported-file-tree", "npm run verify:imported-file-tree"],
  ["verify:numbers-animation", "npm run verify:numbers-animation"],
  ["verify:public-stats", "npm run verify:public-stats"],
  ["verify:no-fake-dashboard", "npm run verify:no-fake-dashboard"],
  ["verify:runtime-health", "npm run verify:runtime-health"],
  ["verify:admin-diagnostics", "npm run verify:admin-diagnostics"],
  ["verify:fast", "npm run verify:fast"],
  ["typecheck", "npm run typecheck"],
];

console.log("\n=== verify:production-gate ===");
console.log(`[gate] ${steps.length} steps — no benchmarks, no provider calls\n`);

const suiteStart = Date.now();
let failed = false;

for (const [name, cmd] of steps) {
  const limits =
    name === "verify:tls"
      ? { maxSilenceMs: 35_000, maxTotalMs: 45_000 }
      : name === "typecheck"
        ? { maxSilenceMs: 120_000, maxTotalMs: 300_000 }
        : {};
  const r = await runStep(name, cmd, { cwd: root, env: verifyEnv, ...limits });
  if (r.status !== 0) {
    failed = true;
    break;
  }
}

console.log(
  `\n=== verify:production-gate ${failed ? "FAILED" : "PASSED"} in ${formatElapsed(Date.now() - suiteStart)} ===\n`,
);
process.exit(failed ? 1 : 0);

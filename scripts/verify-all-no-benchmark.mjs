#!/usr/bin/env node
/**
 * Full no-benchmark verify — streaming output, per-step elapsed, silence watchdog.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withSafeTlsEnv } from "./lib/tls-env.mjs";
import { writeEvidence } from "./lib/e2e-live.mjs";
import { runStep, formatElapsed } from "./lib/verify-runner.mjs";
import { diagnoseDevServer, devServerBaseUrl } from "./lib/dev-server.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const verifyEnv = withSafeTlsEnv({ ...process.env });
delete verifyEnv.E2E_RUN_LIVE;
delete verifyEnv.BENCHMARK_LIVE;

const BENCHMARK_PREFIX = "benchmark:";
const DEV_SERVER_STEPS = new Set(["verify:zip-import-live-route", "verify:editor"]);

const steps = [
  ["verify:auth-session", "npm run verify:auth-session"],
  ["verify:tls", "npm run verify:tls"],
  ["verify:env-safety", "npm run verify:env-safety"],
  ["verify:public-copy", "npm run verify:public-copy"],
  ["verify:changelog", "npm run verify:changelog"],
  ["verify:storage", "npm run verify:storage"],
  ["verify:app-files-schema", "npm run verify:app-files-schema"],
  ["verify:runtime-schema-contract", "npm run verify:runtime-schema-contract"],
  ["verify:ai-provider-fallback", "npm run verify:ai-provider-fallback"],
  ["verify:ai-runtime-preflight", "npm run verify:ai-runtime-preflight"],
  ["verify:billing-schema-gate", "npm run verify:billing-schema-gate"],
  ["verify:credit-truth", "npm run verify:credit-truth"],
  ["verify:numbers-animation", "npm run verify:numbers-animation"],
  ["verify:no-fake-dashboard", "npm run verify:no-fake-dashboard"],
  ["verify:create-routing", "npm run verify:create-routing"],
  ["verify:runtime-health", "npm run verify:runtime-health"],
  ["verify:admin-diagnostics", "npm run verify:admin-diagnostics"],
  ["verify:billing", "npm run verify:billing"],
  ["verify:credits", "npm run verify:credits"],
  ["verify:admin-credit-economy", "npm run verify:admin-credit-economy"],
  ["verify:diagnostics", "npm run verify:diagnostics"],
  ["verify:chat", "npm run verify:chat"],
  ["verify:generation", "npm run verify:generation"],
  ["verify:blueprint", "npm run verify:blueprint"],
  ["verify:templates", "npm run verify:templates"],
  ["verify:backend-generation", "npm run verify:backend-generation"],
  ["verify:database-depth", "npm run verify:database-depth"],
  ["verify:zip-import", "npm run verify:zip-import"],
  ["verify:zip-import-live-route", "npm run verify:zip-import-live-route"],
  ["verify:polling", "npm run verify:polling"],
  ["verify:pricing", "npm run verify:pricing"],
  ["verify:analytics", "npm run verify:analytics"],
  ["verify:imported-file-tree", "npm run verify:imported-file-tree"],
  ["verify:secrets-setup", "npm run verify:secrets-setup"],
  ["verify:integrations-ux", "npm run verify:integrations-ux"],
  ["verify:app-icons", "npm run verify:app-icons"],
  ["verify:project-banners", "npm run verify:project-banners"],
  ["verify:project-cards", "npm run verify:project-cards"],
  ["verify:public-stats", "npm run verify:public-stats"],
  ["verify:home-page", "npm run verify:home-page"],
  ["verify:route-stability", "npm run verify:route-stability"],
  ["verify:users-panel", "npm run verify:users-panel"],
  ["verify:imported-dashboard-copy", "npm run verify:imported-dashboard-copy"],
  ["verify:chat-persistence", "npm run verify:chat-persistence"],
  ["verify:chat-routing", "npm run verify:chat-routing"],
  ["verify:chat-send-latency", "npm run verify:chat-send-latency"],
  ["verify:navigation-reliability", "npm run verify:navigation-reliability"],
  ["verify:credit-sync", "npm run verify:credit-sync"],
  ["verify:credit-display", "npm run verify:credit-display"],
  ["verify:admin-users-credits", "npm run verify:admin-users-credits"],
  ["verify:loading-states", "npm run verify:loading-states"],
  ["verify:slow-routes", "npm run verify:slow-routes"],
  ["verify:data-consistency", "npm run verify:data-consistency"],
  ["verify:deploy", "npm run verify:deploy"],
  ["verify:auth", "npm run verify:auth"],
  ["verify:credit-economy-db", "npm run verify:credit-economy-db"],
  ["verify:builder-db", "npm run verify:builder-db"],
  ["verify:wiring", "npm run verify:wiring"],
  ["verify:repair", "npm run verify:repair"],
  ["verify:model-orchestration", "npm run verify:model-orchestration"],
  ["verify:first-prompt-intent", "npm run verify:first-prompt-intent"],
  ["verify:create-question-pricing", "npm run verify:create-question-pricing"],
  ["verify:huge-prompt-intake", "npm run verify:huge-prompt-intake"],
  ["verify:chunked-huge-prompt-intake", "npm run verify:chunked-huge-prompt-intake"],
  ["verify:heavy-brief-cap", "npm run verify:heavy-brief-cap"],
  ["verify:heavy-input-budget", "npm run verify:heavy-input-budget"],
  ["verify:first-pass-task-cap", "npm run verify:first-pass-task-cap"],
  ["verify:prompt-length-ignored", "npm run verify:prompt-length-ignored"],
  ["verify:backlog-credit-policy", "npm run verify:backlog-credit-policy"],
  ["verify:first-pass-scope", "npm run verify:first-pass-scope"],
  ["verify:build-backlog", "npm run verify:build-backlog"],
  ["verify:continue-build-flow", "npm run verify:continue-build-flow"],
  ["verify:build-credit-classifier", "npm run verify:build-credit-classifier"],
  ["verify:build-credit-policy", "npm run verify:build-credit-policy"],
  ["verify:create-flow", "npm run verify:create-flow"],
  ["verify:project-dashboard", "npm run verify:project-dashboard"],
  ["verify:project-lifecycle", "npm run verify:project-lifecycle"],
  ["verify:publish", "npm run verify:publish"],
  ["verify:intent-gate", "npm run verify:intent-gate"],
  ["verify:model-cost-optimizer", "npm run verify:model-cost-optimizer"],
  ["verify:ids", "npm run verify:ids"],
  ["verify:competitive-score", "npm run verify:competitive-score"],
  ["verify:navigation", "npm run verify:navigation"],
  ["verify:performance", "npm run verify:performance"],
  ["verify:public-landing", "npm run verify:public-landing"],
  ["verify:e2e", "npm run verify:e2e"],
  ["verify:preview", "npm run verify:preview"],
  ["verify:production-hardening", "npm run verify:production-hardening"],
  ["verify:security", "npm run verify:security"],
  ["verify:rls", "npm run verify:rls"],
  ["verify:no-secrets-client", "npm run verify:no-secrets-client"],
  ["verify:no-email-secret-client", "npm run verify:no-email-secret-client"],
  ["verify:email-config", "npm run verify:email-config"],
  ["verify:contact-requests", "npm run verify:contact-requests"],
  ["verify:admin-contact-center", "npm run verify:admin-contact-center"],
  ["verify:contact-email-notifications", "npm run verify:contact-email-notifications"],
  ["verify:action-credits", "npm run verify:action-credits"],
  ["verify:runtime-action-metering", "npm run verify:runtime-action-metering"],
  ["verify:runtime-contact-routing", "npm run verify:runtime-contact-routing"],
  ["verify:project-contact-inbox", "npm run verify:project-contact-inbox"],
  ["verify:contact-owner-isolation", "npm run verify:contact-owner-isolation"],
  ["verify:action-credit-email-metering", "npm run verify:action-credit-email-metering"],
  ["verify:no-provider-cost-client", "npm run verify:no-provider-cost-client"],
  ["verify:rate-limits", "npm run verify:rate-limits"],
  ["verify:mutation-guards", "npm run verify:mutation-guards"],
  ["verify:audit-logs", "npm run verify:audit-logs"],
  ["verify:ui-quality", "npm run verify:ui-quality"],
  ["verify:preview-providers", "npm run verify:preview-providers"],
  ["verify:mobile-layout", "npm run verify:mobile-layout"],
  ["verify:editor", "npm run verify:editor"],
  ["verify:dns-wildcard", "npm run verify:dns-wildcard"],
  ["typecheck", "npm run typecheck"],
  ["build", "npm run build"],
  ["verify:health", "npm run verify:health"],
].filter(([name]) => !name.startsWith(BENCHMARK_PREFIX) && name !== "verify:benchmark-evidence");

console.log("\n=== verify:all:no-benchmark ===");
console.log(`[verify] ${steps.length} steps — streaming output, 60s heartbeat, 120s silence limit\n`);

const suiteStart = Date.now();
let failed = false;

for (const [name, cmd] of steps) {
  if (DEV_SERVER_STEPS.has(name)) {
    const diag = await diagnoseDevServer(devServerBaseUrl());
    if (diag.state !== "healthy") {
      console.error(`\n✗ ${name} requires dev server but: ${diag.message}`);
      console.error("  Run: npm run doctor:dev-server");
      console.error("  Or:  npm run verify:all:no-benchmark:with-server\n");
      failed = true;
      break;
    }
    console.log(`[dev-server] ✓ ${diag.message}`);
  }

  const r = await runStep(name, cmd, { cwd: root, env: verifyEnv });
  if (r.status !== 0) {
    failed = true;
    break;
  }
}

if (!failed) writeEvidence({ verifyPassed: true });
console.log(
  `\n=== verify:all:no-benchmark ${failed ? "FAILED" : "PASSED"} in ${formatElapsed(Date.now() - suiteStart)} ===\n`,
);
process.exit(failed ? 1 : 0);

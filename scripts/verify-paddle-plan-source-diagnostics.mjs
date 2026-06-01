#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
    return false;
  }
  console.log(`OK: ${msg}`);
  return true;
}

const checks = [
  () =>
    assert(read("src/lib/billing/billing-truth.ts").includes("admin_granted"), "billingState admin_granted"),
  () =>
    assert(read("src/lib/billing/billing-truth.ts").includes("planSource"), "planSource field"),
  () =>
    assert(read("src/lib/billing/billing-truth.ts").includes('caseId: "A"'), "Case A internal Pro narrative"),
  () =>
    assert(read("src/app/api/billing/status/route.ts").includes("billingTruth"), "status returns billingTruth"),
  () =>
    assert(read("src/app/api/billing/status/route.ts").includes("planSource"), "status returns planSource"),
  () =>
    assert(read("src/app/api/billing/paddle/attempt/start/route.ts").includes("createBillingAttempt"), "attempt start before Paddle"),
  () =>
    assert(
      read("src/components/admin/admin-paddle-test-checkout.tsx").includes("BillingTruthPanel"),
      "admin test shows truth panel",
    ),
  () =>
    assert(
      read("src/components/admin/admin-paddle-test-checkout.tsx").includes("checkoutButtonLabel"),
      "dynamic checkout button label",
    ),
  () =>
    assert(
      read("src/components/admin/admin-paddle-test-checkout.tsx").includes("attempt/start"),
      "admin calls attempt start on click",
    ),
  () =>
    assert(
      read("src/lib/billing/diagnose-billing-attempt.ts").includes("paddle_webhook_not_received"),
      "diagnose exposes paddle_webhook_not_received",
    ),
  () =>
    assert(
      read("src/lib/billing/unified-billing-action.ts").includes("hasActiveSubscription"),
      "unified action uses subscription id",
    ),
  () =>
    assert(
      read("src/lib/billing/billing-attempt-steps.ts").includes("no_paddle_subscription_existing_user_internal_plan_only"),
      "internal plan only step reason",
    ),
  () =>
    assert(
      read("src/app/api/billing/status/route.ts").includes("upgradeComplete"),
      "success gated on diagnosis",
    ),
];

for (const c of checks) {
  if (!c()) break;
}

if (process.exitCode) {
  console.error("\nverify:paddle-plan-source-diagnostics failed");
  process.exit(1);
}
console.log("\nverify:paddle-plan-source-diagnostics — all checks passed");

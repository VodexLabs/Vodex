#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const must = (rel, needle, label) => {
  if (!fs.readFileSync(path.join(root, rel), "utf8").includes(needle)) errors.push(label);
};

must("src/lib/billing/apply-admin-plan-change.ts", "plan_upgrade_delta", "upgrade ledger source");
must("src/lib/billing/mid-cycle-upgrade-credits.ts", "computeUpgradeCycleCredits", "delta math");
must("src/lib/billing/apply-immediate-plan-upgrade.ts", "computeUpgradeCycleCredits", "paddle upgrade delta");

if (errors.length) {
  console.error("verify:action-credit-ledger FAILED\n", errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("verify:action-credit-ledger OK");

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const coverage = fs.readFileSync(
  path.join(root, "src/lib/action-credits/runtime-metering-coverage.ts"),
  "utf8",
);

if (!coverage.includes("meterRuntimeActionForOwner")) errors.push("coverage registry missing");
else ok.push("coverage registry");

const charge = fs.readFileSync(path.join(root, "src/lib/action-credits/charge-action-credit.ts"), "utf8");
if (!charge.includes("assertActionCreditsAffordable")) errors.push("charge missing precheck");
else ok.push("charge precheck");

const identity = fs.readFileSync(path.join(root, "src/lib/projects/app-identity-service.ts"), "utf8");
const regenIdx = identity.indexOf("export async function regenerateAppLogo");
const regenBody = regenIdx > 0 ? identity.slice(regenIdx, regenIdx + 2500) : "";
if (
  !regenBody.includes("const charge = await chargeActionCredit") ||
  regenBody.indexOf("const charge = await chargeActionCredit") >=
    regenBody.indexOf("const logo = await generateAppLogo")
) {
  errors.push("logo regen charge after generate");
} else ok.push("logo atomic order");

if (!fs.readFileSync(path.join(root, "src/lib/contact/save-contact-request.ts"), "utf8").includes("meterRuntimeActionForOwner")) {
  errors.push("contact not metered");
} else ok.push("contact metered");

console.log("\n=== verify:runtime-metering-coverage ===\n");
ok.forEach((m) => console.log(`✓ ${m}`));
errors.forEach((m) => console.error(`✗ ${m}`));
process.exit(errors.length ? 1 : 0);

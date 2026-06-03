#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== "node_modules") walk(p, out);
    else if (ent.isFile() && /\.(tsx|ts|jsx|js)$/.test(ent.name)) out.push(p);
  }
  return out;
}

const upgradeBillingRe =
  /(?:href|to)=\{?["']\/settings\/billing["']\}?[^>]*>[\s\S]{0,120}Upgrade|Upgrade[\s\S]{0,120}(?:href|to)=\{?["']\/settings\/billing["']\}?/i;

for (const f of walk(path.join(root, "src"))) {
  const rel = path.relative(root, f).replace(/\\/g, "/");
  if (rel.includes("user-menu.tsx")) continue;
  const src = fs.readFileSync(f, "utf8");
  if (upgradeBillingRe.test(src)) errors.push(`Upgrade CTA still points to billing: ${rel}`);
}

const credits = fs.readFileSync(path.join(root, "src/components/chat/credits-upgrade-modal.tsx"), "utf8");
if (!credits.includes("credits-upgrade-reminder-pill")) errors.push("upgrade reminder pill");
if (!credits.includes('href="/pricing"')) errors.push("pricing CTA in credits modal");

const billing = fs.readFileSync(
  path.join(root, "src/components/billing/billing-subscription-panel.tsx"),
  "utf8",
);
if (!billing.includes("BillingIntervalPickerModal")) {
  errors.push("billing interval picker before checkout");
}

if (errors.length) {
  console.error("verify:billing-upgrade-flow FAILED\n", errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log("verify:billing-upgrade-flow OK");

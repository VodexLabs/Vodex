#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) errors.push(`missing ${rel}`);
  else ok.push(rel);
}

function mustInclude(rel, needles) {
  const t = fs.readFileSync(path.join(root, rel), "utf8");
  for (const n of needles) {
    if (!t.includes(n)) errors.push(`${rel} missing ${n}`);
  }
}

mustExist("src/app/api/billing/paddle/checkout/route.ts");
mustExist("src/app/api/billing/paddle/webhook/route.ts");
mustExist("src/app/api/billing/paddle/status/route.ts");
mustExist("src/lib/billing/paddle-api.ts");
mustExist("src/lib/billing/sync-plan-credits.ts");

mustInclude("src/app/api/billing/paddle/checkout/route.ts", ["setup_required", "503"]);
mustInclude("src/app/api/billing/paddle/webhook/route.ts", ["verifyPaddleWebhookSignature", "503"]);
mustInclude("src/lib/billing/paddle-webhook-handlers.ts", ["syncPlanCreditsForUser"]);

const checkout = fs.readFileSync(path.join(root, "src/app/api/billing/paddle/checkout/route.ts"), "utf8");
if (/checkoutUrl:\s*["']https:\/\/fake/i.test(checkout)) errors.push("fake paddle checkout url");
else ok.push("no fake checkout url");

console.log("\n=== verify:paddle-billing ===\n");
ok.forEach((m) => console.log(`✓ ${m}`));
errors.forEach((m) => console.error(`✗ ${m}`));
process.exit(errors.length ? 1 : 0);

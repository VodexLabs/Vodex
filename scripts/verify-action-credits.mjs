#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const migration = path.join(root, "supabase/migrations/20260626120000_contact_center_action_credits.sql");
const pricing = path.join(root, "src/lib/action-credits/action-credit-pricing.ts");
const charge = path.join(root, "src/lib/action-credits/charge-action-credit.ts");

const mig = fs.existsSync(migration) ? fs.readFileSync(migration, "utf8") : "";
if (mig.includes("action_credit_balances") && mig.includes("charge_action_credits")) ok.push("action credits migration");
else errors.push("action credits migration missing");

const pr = fs.existsSync(pricing) ? fs.readFileSync(pricing, "utf8") : "";
if (pr.includes("ACTION_PROVIDER_USD_PER_CREDIT")) ok.push("action provider budget per credit");
else errors.push("ACTION_PROVIDER_USD_PER_CREDIT missing");

if (fs.existsSync(charge) && fs.readFileSync(charge, "utf8").includes("charge_action_credits")) ok.push("charge-action-credit RPC wrapper");
else errors.push("charge-action-credit missing");

console.log("\n=== verify:action-credits ===\n");
ok.forEach((m) => console.log(`✓ ${m}`));
errors.forEach((m) => console.error(`✗ ${m}`));
process.exit(errors.length ? 1 : 0);

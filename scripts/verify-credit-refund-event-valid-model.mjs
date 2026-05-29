#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mig = fs.readFileSync(
  path.join(root, "supabase/migrations/20260704120000_p06_grant_tokens_model_id.sql"),
  "utf8",
);
const credits = fs.readFileSync(path.join(root, "src/lib/billing/credit-reservations.ts"), "utf8");
const errors = [];
if (!mig.includes("model_id") || !mig.includes("system_refund")) {
  errors.push("migration must set model_id default system_refund");
}
if (!credits.includes("system_refund")) {
  errors.push("grantRefund metadata must include system_refund");
}
if (errors.length) {
  console.error("verify:credit-refund-event-valid-model FAILED");
  errors.forEach((e) => console.error(" ✗", e));
  process.exit(1);
}
console.log("verify:credit-refund-event-valid-model OK");

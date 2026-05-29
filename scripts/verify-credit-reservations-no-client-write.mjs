#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mig = fs.readFileSync(
  path.join(root, "supabase/migrations/20260603120000_credit_economy_tables.sql"),
  "utf8",
);
const errors = [];
if (mig.includes("for insert") && mig.match(/credit_reservations[\s\S]*for insert/i)) {
  errors.push("users should not have insert on credit_reservations");
}
if (!mig.includes("for select using (auth.uid() = user_id)")) {
  errors.push("owners need select-only policy");
}
const src = fs.readFileSync(path.join(root, "src/lib/billing/credit-reservations.ts"), "utf8");
if (!src.includes("reservationWriter")) errors.push("server must use reservationWriter");

if (errors.length) {
  console.error("verify:credit-reservations-no-client-write FAILED");
  errors.forEach((e) => console.error(" ✗", e));
  process.exit(1);
}
console.log("verify:credit-reservations-no-client-write OK");

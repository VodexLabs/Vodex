#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "src/lib/billing/credit-reservations.ts"), "utf8");
if (!src.includes('from("credit_reservations"') || !src.includes("reservationWriter")) {
  console.error("verify:restaurant-no-credit-permission-noise FAILED");
  process.exit(1);
}
console.log("verify:restaurant-no-credit-permission-noise OK");

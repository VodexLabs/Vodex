#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const save = path.join(root, "src/lib/contact/save-contact-request.ts");
const t = fs.existsSync(save) ? fs.readFileSync(save, "utf8") : "";
if (t.includes("meterEmailToOwner") && t.includes("chargeActionCredit")) ok.push("email metering on generated app contacts");
else errors.push("action credit email metering missing");

console.log("\n=== verify:action-credit-email-metering ===\n");
ok.forEach((m) => console.log(`✓ ${m}`));
errors.forEach((m) => console.error(`✗ ${m}`));
process.exit(errors.length ? 1 : 0);

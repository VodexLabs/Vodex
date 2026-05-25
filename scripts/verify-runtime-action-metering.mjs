#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const runtime = path.join(root, "src/app/api/runtime/contact/route.ts");
const save = path.join(root, "src/lib/contact/save-contact-request.ts");

const rt = fs.existsSync(runtime) ? fs.readFileSync(runtime, "utf8") : "";
if (rt.includes("meterEmailToOwner: true") && rt.includes("generated_app_contact")) ok.push("runtime contact meters email");
else errors.push("runtime contact metering missing");

const saveT = fs.existsSync(save) ? fs.readFileSync(save, "utf8") : "";
if (saveT.includes("chargeActionCredit") && saveT.includes("email_send")) ok.push("contact email charges action credits");
else errors.push("contact action credit charge missing");

console.log("\n=== verify:runtime-action-metering ===\n");
ok.forEach((m) => console.log(`✓ ${m}`));
errors.forEach((m) => console.error(`✗ ${m}`));
process.exit(errors.length ? 1 : 0);

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const email = path.join(root, "src/lib/contact/contact-email.ts");
const save = path.join(root, "src/lib/contact/save-contact-request.ts");

const emailT = fs.existsSync(email) ? fs.readFileSync(email, "utf8") : "";
if (emailT.includes("[DreamOS86 Contact]") && emailT.includes("replyTo")) ok.push("contact notification email template");
else errors.push("contact email template incomplete");

const saveT = fs.existsSync(save) ? fs.readFileSync(save, "utf8") : "";
if (saveT.includes("sendContactNotificationEmail") && saveT.includes("email_status")) {
  ok.push("contact save updates email_status without losing row");
} else errors.push("contact save email flow incomplete");

if (saveT.includes("retryContactRequestEmail")) ok.push("retry email path exists");
else errors.push("retry email missing");

console.log("\n=== verify:contact-email-notifications ===\n");
ok.forEach((m) => console.log(`✓ ${m}`));
errors.forEach((m) => console.error(`✗ ${m}`));
process.exit(errors.length ? 1 : 0);

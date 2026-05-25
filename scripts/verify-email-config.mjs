#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const emailConfig = path.join(root, "src/lib/email/email-config.ts");
const sendResend = path.join(root, "src/lib/email/send-resend-email.ts");
const envExample = path.join(root, ".env.example");

if (fs.existsSync(emailConfig)) {
  const t = fs.readFileSync(emailConfig, "utf8");
  if (t.includes("RESEND_API_KEY") && t.includes("EMAIL_FROM") && t.includes("CONTACT_NOTIFICATIONS_TO")) {
    ok.push("email-config exposes server env keys");
  } else errors.push("email-config missing required env keys");
  if (t.includes("RESEND_DNS_SENDING_GUIDANCE")) ok.push("DNS sending guidance documented");
  else errors.push("missing DNS sending guidance");
} else errors.push("email-config.ts missing");

if (fs.existsSync(sendResend)) {
  const t = fs.readFileSync(sendResend, "utf8");
  if (t.includes("api.resend.com/emails") && !t.includes("NEXT_PUBLIC")) ok.push("send-resend-email uses server Resend API");
  else errors.push("send-resend-email invalid");
} else errors.push("send-resend-email.ts missing");

if (fs.existsSync(envExample)) {
  const t = fs.readFileSync(envExample, "utf8");
  if (t.includes("RESEND_API_KEY") && t.includes("EMAIL_FROM")) ok.push(".env.example documents email vars");
  else errors.push(".env.example missing email vars");
}

console.log("\n=== verify:email-config ===\n");
ok.forEach((m) => console.log(`✓ ${m}`));
errors.forEach((m) => console.error(`✗ ${m}`));
process.exit(errors.length ? 1 : 0);

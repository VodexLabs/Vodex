#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const migration = path.join(root, "supabase/migrations/20260626120000_contact_center_action_credits.sql");
const service = path.join(root, "src/lib/contact/save-contact-request.ts");
const contactApi = path.join(root, "src/app/api/contact/route.ts");
const runtimeApi = path.join(root, "src/app/api/runtime/contact/route.ts");

if (fs.existsSync(migration) && fs.readFileSync(migration, "utf8").includes("contact_requests")) {
  ok.push("contact_requests migration present");
} else errors.push("contact_requests migration missing");

if (fs.existsSync(service) && fs.readFileSync(service, "utf8").includes("createContactRequest")) {
  ok.push("save-contact-request service");
} else errors.push("save-contact-request missing");

for (const [label, file] of [
  ["contact API", contactApi],
  ["runtime contact API", runtimeApi],
]) {
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8").includes("createContactRequest")) {
    ok.push(`${label} saves via service`);
  } else errors.push(`${label} missing createContactRequest`);
}

console.log("\n=== verify:contact-requests ===\n");
ok.forEach((m) => console.log(`✓ ${m}`));
errors.forEach((m) => console.error(`✗ ${m}`));
process.exit(errors.length ? 1 : 0);

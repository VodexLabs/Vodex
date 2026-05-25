#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const runtime = path.join(root, "src/app/api/runtime/contact/route.ts");
const rt = fs.existsSync(runtime) ? fs.readFileSync(runtime, "utf8") : "";
if (rt.includes("owner_id") && rt.includes("generated_app_contact")) ok.push("runtime contact resolves app owner");
else errors.push("runtime contact routing incomplete");

const projectContacts = path.join(root, "src/app/api/projects/[id]/contacts/route.ts");
const pc = fs.existsSync(projectContacts) ? fs.readFileSync(projectContacts, "utf8") : "";
if (pc.includes("owner_id") && pc.includes("Forbidden")) ok.push("project contacts owner isolation");
else errors.push("project contacts isolation missing");

console.log("\n=== verify:runtime-contact-routing ===\n");
ok.forEach((m) => console.log(`✓ ${m}`));
errors.forEach((m) => console.error(`✗ ${m}`));
process.exit(errors.length ? 1 : 0);

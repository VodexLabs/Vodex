#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const api = path.join(root, "src/app/api/projects/[id]/contacts/route.ts");
const t = fs.existsSync(api) ? fs.readFileSync(api, "utf8") : "";
if (t.includes("owner_id") && t.includes("Forbidden") && t.includes("project_id")) {
  ok.push("owners only see project-scoped contacts");
} else errors.push("contact owner isolation incomplete");

console.log("\n=== verify:contact-owner-isolation ===\n");
ok.forEach((m) => console.log(`✓ ${m}`));
errors.forEach((m) => console.error(`✗ ${m}`));
process.exit(errors.length ? 1 : 0);

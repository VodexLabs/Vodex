#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const dash = path.join(root, "src/components/apps/app-project-dashboard.tsx");
const panel = path.join(root, "src/components/projects/project-contacts-panel.tsx");
const api = path.join(root, "src/app/api/projects/[id]/contacts/route.ts");

if (fs.existsSync(dash) && fs.readFileSync(dash, "utf8").includes('"contacts"')) ok.push("app dashboard contacts tab");
else errors.push("app dashboard contacts tab missing");

if (fs.existsSync(panel) && fs.existsSync(api)) ok.push("project contacts panel + API");
else errors.push("project contacts inbox missing");

console.log("\n=== verify:project-contact-inbox ===\n");
ok.forEach((m) => console.log(`✓ ${m}`));
errors.forEach((m) => console.error(`✗ ${m}`));
process.exit(errors.length ? 1 : 0);

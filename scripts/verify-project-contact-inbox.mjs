#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const dash = path.join(root, "src/components/create/workspace/app-dashboard-panel.tsx");
const panel = path.join(root, "src/components/projects/project-contacts-panel.tsx");
const api = path.join(root, "src/app/api/projects/[id]/contacts/route.ts");

const dashSrc = fs.existsSync(dash) ? fs.readFileSync(dash, "utf8") : "";
if (dashSrc.includes("Contact inbox") && dashSrc.includes("/contacts")) {
  ok.push("app dashboard contact inbox");
} else {
  errors.push("app dashboard contact inbox missing");
}

if (fs.existsSync(panel) && fs.existsSync(api)) ok.push("project contacts panel + API");
else errors.push("project contacts inbox missing");

console.log("\n=== verify:project-contact-inbox ===\n");
ok.forEach((m) => console.log(`✓ ${m}`));
errors.forEach((m) => console.error(`✗ ${m}`));
process.exit(errors.length ? 1 : 0);

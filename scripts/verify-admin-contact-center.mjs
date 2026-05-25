#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const panel = path.join(root, "src/components/admin/contact-requests-panel.tsx");
const adminRoute = path.join(root, "src/app/api/admin/contact-requests/route.ts");
const adminView = path.join(root, "src/components/admin/admin-view.tsx");

const panelT = fs.existsSync(panel) ? fs.readFileSync(panel, "utf8") : "";
if (panelT.includes("Contact Center") && panelT.includes("retryEmail") && panelT.includes("internal_note")) {
  ok.push("admin Contact Center panel");
} else errors.push("Contact Center panel incomplete");

const routeT = fs.existsSync(adminRoute) ? fs.readFileSync(adminRoute, "utf8") : "";
if (routeT.includes("retry_email") && routeT.includes("dnsGuidance")) ok.push("admin contact-requests API");
else errors.push("admin contact-requests API incomplete");

if (fs.existsSync(adminView) && fs.readFileSync(adminView, "utf8").includes('id: "contacts"')) {
  ok.push("admin view contacts tab");
} else errors.push("admin contacts tab missing");

console.log("\n=== verify:admin-contact-center ===\n");
ok.forEach((m) => console.log(`✓ ${m}`));
errors.forEach((m) => console.error(`✗ ${m}`));
process.exit(errors.length ? 1 : 0);

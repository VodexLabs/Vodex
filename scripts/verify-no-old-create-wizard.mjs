#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const createPage = fs.readFileSync(path.join(root, "src/app/(workspace)/create/page.tsx"), "utf8");
const errors = [];
const ok = [];

if (createPage.includes("PremiumCreateFunnel")) errors.push("old wizard on create route");
else ok.push("no PremiumCreateFunnel on route");

if (createPage.includes("CreationWorkspace")) errors.push("old CreationWorkspace on route");
else ok.push("no CreationWorkspace on route");

console.log("\n=== verify:no-old-create-wizard ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

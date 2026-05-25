#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const admin = fs.readFileSync(path.join(root, "src/app/api/admin/mobile-builds/route.ts"), "utf8");
const studio = fs.readFileSync(path.join(root, "src/components/mobile/mobile-wrapper-studio.tsx"), "utf8");
const errors = [];
const ok = [];

if (!admin.includes("provider_cost_usd")) errors.push("admin provider cost");
else ok.push("admin provider cost");

if (studio.includes("provider_cost") || studio.includes("providerCostUsd")) {
  errors.push("provider cost in user UI");
} else ok.push("no provider cost in user UI");

console.log("\n=== verify:mobile-cost-admin-only ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

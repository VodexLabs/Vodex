#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const builder = fs.readFileSync(path.join(root, "src/components/builder/app-builder-workspace.tsx"), "utf8");
const features = fs.readFileSync(path.join(root, "src/lib/billing/plan-features.ts"), "utf8");
const errors = [];
const ok = [];

if (!features.includes("canManualCodeEdit")) errors.push("canManualCodeEdit helper");
else ok.push("canManualCodeEdit helper");

if (!builder.includes("canManualCodeEdit")) errors.push("builder uses plan gate");
else ok.push("builder uses plan gate");

if (!builder.includes("view-only on the Free plan")) errors.push("free plan read-only copy");
else ok.push("free plan read-only copy");

console.log("\n=== verify:manual-code-edit-plan-gate ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

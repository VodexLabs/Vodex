#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const r = fs.readFileSync(path.join(root, "src/lib/mobile/readiness.ts"), "utf8");
const errors = [];
const ok = [];

if (!r.includes("scanAndroidReadiness")) errors.push("android readiness");
else ok.push("android readiness");
if (!r.includes("package_id")) errors.push("package id check");
else ok.push("package id check");

console.log("\n=== verify:mobile-readiness-android ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

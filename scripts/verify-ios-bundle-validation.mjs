#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const v = fs.readFileSync(path.join(root, "src/lib/mobile/package-validation.ts"), "utf8");
const errors = [];
const ok = [];

if (!v.includes("validateIosBundleId")) errors.push("validateIosBundleId");
else ok.push("validateIosBundleId");

console.log("\n=== verify:ios-bundle-validation ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

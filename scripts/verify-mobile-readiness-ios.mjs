#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const r = fs.readFileSync(path.join(root, "src/lib/mobile/readiness.ts"), "utf8");
const errors = [];
const ok = [];

if (!r.includes("scanIosReadiness")) errors.push("ios readiness");
else ok.push("ios readiness");
if (!r.includes("Apple Developer")) errors.push("honest apple copy");
else ok.push("honest apple copy");

console.log("\n=== verify:mobile-readiness-ios ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const s = fs.readFileSync(path.join(root, "src/lib/mobile/secrets.ts"), "utf8");
const studio = fs.readFileSync(path.join(root, "src/components/mobile/mobile-wrapper-studio.tsx"), "utf8");
const errors = [];
const ok = [];

if (!s.includes("sanitizeMobileBuildLog")) errors.push("log sanitize");
else ok.push("log sanitize");

if (!studio.includes("never in chat")) errors.push("secrets not in chat copy");
else ok.push("secrets not in chat copy");

console.log("\n=== verify:mobile-secrets-safe ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

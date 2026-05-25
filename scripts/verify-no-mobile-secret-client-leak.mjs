#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const studio = fs.readFileSync(path.join(root, "src/components/mobile/mobile-wrapper-studio.tsx"), "utf8");
const errors = [];
const ok = [];

if (studio.includes("defaultValue={") && studio.includes("MOBILE_SECRET")) {
  errors.push("secret values in client");
} else ok.push("no secret values client");

if (!studio.includes("encrypted")) errors.push("encrypted messaging");
else ok.push("encrypted messaging");

console.log("\n=== verify:no-mobile-secret-client-leak ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

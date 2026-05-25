#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const s = fs.readFileSync(path.join(root, "src/components/mobile/mobile-wrapper-studio.tsx"), "utf8");
const errors = [];
const ok = [];

if (!s.includes("push_notifications")) errors.push("push permission UI");
else ok.push("push permission UI");

console.log("\n=== verify:push-setup-ui ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

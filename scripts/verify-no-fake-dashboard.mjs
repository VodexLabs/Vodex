#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dash = fs.readFileSync(path.join(root, "src/app/(app)/dashboard/page.tsx"), "utf8");
const errors = [];
const ok = [];

if (!/redirect\s*\(\s*["']\/["']\s*\)/.test(dash)) {
  errors.push("/dashboard must redirect to /");
} else ok.push("/dashboard redirects to home");

if (/Workspace hub/.test(dash)) errors.push("/dashboard still renders Workspace hub");
else ok.push("fake Workspace hub removed");

console.log("\n=== verify:no-fake-dashboard ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

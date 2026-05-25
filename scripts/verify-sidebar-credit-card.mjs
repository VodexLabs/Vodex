#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "src/components/layout/sidebar.tsx"), "utf8");
const errors = [];
const ok = [];

if (src.includes("CreditsTracker") && src.includes('variant="mini"')) ok.push("sidebar mini tracker");
else errors.push("sidebar missing mini tracker");

console.log("\n=== verify:sidebar-credit-card ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

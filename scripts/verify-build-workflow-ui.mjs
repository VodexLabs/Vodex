#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const narrator = fs.readFileSync(path.join(root, "src/components/create/workspace/build-status-narrator.tsx"), "utf8");
const errors = [];
const ok = [];

if (!narrator.includes("Understanding your app")) errors.push("premium stage labels");
else ok.push("premium stage labels");

if (!narrator.includes("BuildStatusNarrator")) errors.push("BuildStatusNarrator component");
else ok.push("BuildStatusNarrator component");

console.log("\n=== verify:build-workflow-ui ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

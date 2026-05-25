#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const lifecycle = fs.readFileSync(path.join(root, "src/lib/projects/project-lifecycle.ts"), "utf8");
const errors = [];
const ok = [];

if (!lifecycle.includes("ctx.fileCount === 0")) errors.push("normalizeProjectStatus missing zero-file guard");
else ok.push("zero-file guard");

if (!lifecycle.includes('stored === "generated" && ctx.fileCount === 0')) errors.push("generated requires files");
else ok.push("generated requires files");

if (!lifecycle.includes("withoutFiles")) errors.push("withoutFiles helper");
else ok.push("withoutFiles helper");

console.log("\n=== verify:build-lifecycle-truth ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const r = fs.readFileSync(path.join(root, "src/lib/mobile/readiness.ts"), "utf8");
const errors = [];
const ok = [];

if (!r.includes("storeReadinessChecklist")) errors.push("store checklists");
else ok.push("store checklists");

console.log("\n=== verify:store-readiness-checklists ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(root, "src/lib/stores/credits-store.ts"), "utf8");
const errors = [];
const ok = [];

if (src.includes("inFlightRequest")) ok.push("shared in-flight promise");
else errors.push("missing in-flight dedupe");

if (src.includes("joined in-flight")) ok.push("dedupe log path");
else errors.push("missing dedupe join");

console.log("\n=== verify:credits-request-dedupe ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

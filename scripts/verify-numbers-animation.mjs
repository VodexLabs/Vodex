#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];
const src = fs.readFileSync(path.join(root, "src/components/os-home/dreamos-stats-section.tsx"), "utf8");

if (!src.includes("useCountUp")) errors.push("stats section missing useCountUp");
else ok.push("useCountUp wired");

if (!src.includes("IntersectionObserver")) errors.push("missing IntersectionObserver");
else ok.push("IntersectionObserver trigger");

if (!/4000|COUNT_DURATION_MS/.test(src)) errors.push("missing ~4s duration");
else ok.push("4s count duration");

if (!src.includes("prefers-reduced-motion")) errors.push("missing reduced motion support");
else ok.push("prefers-reduced-motion");

console.log("\n=== verify:numbers-animation ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

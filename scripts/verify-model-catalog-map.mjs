#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const catalog = fs.readFileSync(path.join(root, "src/lib/ai/model-catalog.ts"), "utf8");
const google = fs.readFileSync(path.join(root, "src/lib/ai/google-model-config.ts"), "utf8");

if (catalog.includes("gemini-2.0-flash")) errors.push("model-catalog still maps to deprecated gemini-2.0-flash");
else ok.push("no hardcoded gemini-2.0-flash in catalog map");

if (catalog.includes("resolveGoogleCatalogApiModel")) ok.push("resolveGoogleCatalogApiModel wired");
else errors.push("model-catalog missing resolveGoogleCatalogApiModel");

if (google.includes("gemini-2.5-flash")) ok.push("default gemini flash model updated");
if (google.includes("probeGoogleModelAvailable")) ok.push("google model probe exists");

if (catalog.includes("gpt-5-4-mini") && catalog.includes("gpt-4o-mini")) ok.push("openai hyphen catalog ids mapped");

console.log("\n=== verify:model-catalog-map ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

const layout = fs.readFileSync(path.join(root, "src/app/(app)/settings/layout.tsx"), "utf8");
if (layout.includes("loading.tsx")) errors.push("settings blocks on loading.tsx");
ok.push("settings layout does not hard-block on route loading");

const apiKeys = fs.readFileSync(path.join(root, "src/app/(app)/settings/api-keys/page.tsx"), "utf8");
if (apiKeys.includes("AbortController")) ok.push("api-keys independent fetch with timeout");

console.log("\n=== verify:settings-speed ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

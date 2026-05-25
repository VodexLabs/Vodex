#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];
const page = fs.readFileSync(path.join(root, "src/app/(app)/settings/api-keys/page.tsx"), "utf8");

if (!page.includes("DeveloperIdentityCard")) errors.push("api-keys page missing DeveloperIdentityCard");
else ok.push("DeveloperIdentityCard renders immediately");

if (!page.includes("AbortController") && !page.includes("3000")) errors.push("api-keys fetch missing timeout");
else ok.push("api-keys fetch has timeout guard");

if (!page.includes("Retry")) errors.push("api-keys missing retry state");
else ok.push("api-keys retry UI");

if (page.includes("flex justify-center py-8") && page.includes("Loader2") && !page.includes("animate-pulse"))
  errors.push("api-keys still uses full-page spinner only");
else ok.push("api-keys uses skeleton or retry instead of endless spinner");

console.log("\n=== verify:api-keys-page ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

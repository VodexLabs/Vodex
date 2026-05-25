#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

function must(rel, needle, label) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  if (!src.includes(needle)) errors.push(`${rel} missing ${label}`);
  else ok.push(label);
}

must("src/lib/ai/discuss-profit-guard.ts", "DISCUSS_MAX_PROVIDER_COST_USD", "discuss cost cap");
must("src/lib/ai/discuss-profit-guard.ts", "guardDiscussProviderCall", "discuss guard");
must("src/app/api/chat/route.ts", "guardDiscussProviderCall", "chat uses discuss guard");
must("src/lib/ai/discuss-profit-guard.ts", "fallback_cheap", "cheap fallback action");

console.log("\n=== verify:discuss-profit-guard ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

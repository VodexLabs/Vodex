#!/usr/bin/env node
/** Mock-only provider fallback checks — no live API calls ($0.00). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

function mustInclude(rel, needle, label) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  if (!src.includes(needle)) errors.push(`${rel} missing ${label}`);
  else ok.push(`${rel}: ${label}`);
}

mustInclude("src/lib/ai/provider-fallback.ts", "resolveDiscussModel", "discuss fallback");
mustInclude("src/lib/ai/provider-fallback.ts", "pickFailoverCatalogModel", "failover catalog");
mustInclude("src/lib/ai/provider-health.ts", "anyProviderSelectable", "provider health");
mustInclude("src/lib/ai/provider-errors.ts", "quota_exhausted", "quota classification");
mustInclude("src/app/api/chat/route.ts", "resolveDiscussModel", "chat uses discuss fallback");
mustInclude("src/lib/ai/provider-fallback.ts", "userSafeAiUnavailableMessage", "user-safe message");

mustInclude("src/lib/ai/provider-availability.ts", "disabledReason", "env disable reason");
mustInclude("src/lib/ai/provider-availability.ts", "AI_PROVIDER_DISABLE_ANTHROPIC", "anthropic env gate");
mustInclude("src/app/api/admin/provider-health/route.ts", "Disabled by environment", "admin health env message");

const avail = fs.readFileSync(path.join(root, "src/lib/ai/provider-availability.ts"), "utf8");
if (!/quota_exhausted/.test(avail)) errors.push("provider-availability missing quota_exhausted handling");
else ok.push("provider-availability tracks quota_exhausted");

console.log("\n=== verify:ai-provider-fallback ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

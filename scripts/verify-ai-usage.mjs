#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

function must(rel, needle, label) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`missing ${rel}`);
    return;
  }
  if (!fs.readFileSync(full, "utf8").includes(needle)) errors.push(`${rel} missing ${label}`);
  else ok.push(label);
}

must("src/app/api/admin/ai-usage/route.ts", "export async function GET", "admin ai usage API");
must("src/components/admin/admin-ai-usage-panel.tsx", "provider", "usage panel provider column");
must("src/lib/ai/model-orchestration-policy.ts", "recordModelDecision", "model decision record");
must("src/lib/ai/model-mix-router.ts", "resolveModelMix", "model mix router");
must("src/lib/ai/model-decision-log.ts", "logInternalModelDecision", "internal model decision log");
must("src/lib/ai/route-decision-log.ts", "logRouteDecision", "route decision log");
must("src/app/api/chat/route.ts", "ai_usage_logs", "chat usage logging");

console.log("\n=== verify:ai-usage ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

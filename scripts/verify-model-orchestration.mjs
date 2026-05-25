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

must("src/lib/ai/model-orchestration-policy.ts", "CHEAP_PLANNER_MODEL_ID", "cheap planner model");
must("src/lib/ai/model-orchestration-policy.ts", "HEAVY_MODEL_OPERATIONS", "heavy ops list");
must("src/lib/ai/cheap-planner.ts", "CHEAP_PLANNER_MODEL_ID", "discuss default cheap planner");
must("src/lib/ai/heavy-task-router.ts", "routeHeavyTask", "heavy router");
must("src/lib/ai/provider-budget-guard.ts", "isAnthropicAvailableForHeavyWork", "anthropic budget guard");
must("src/lib/ai/provider-fallback.ts", "resolveDiscussModel", "discuss fallback");
must("src/lib/ai/routing-smoke-preview.ts", "heavy_build", "routing smoke heavy mode");
must("src/lib/ai/model-catalog-availability.ts", "available_now", "catalog availability classes");
must("src/lib/ai/model-mix-router.ts", "resolveModelMix", "model mix router");
must("src/lib/ai/model-mix-router.ts", "routeMainModelSpec", "main model spec router");
must("src/lib/ai/huge-prompt-intake.ts", "userSelectedModelId", "selected model for intake only");
must("src/lib/build/build-pipeline.ts", "userSelectedModelId", "selected model passed to pipeline");
must("src/lib/ai/smoke-routing-loader.ts", "loadSmokeRoutingConfig", "smoke routing loader");
must("src/app/api/chat/route.ts", "resolveDiscussModel", "chat orchestration");

console.log("\n=== verify:model-orchestration ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

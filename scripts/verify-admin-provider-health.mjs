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

must("src/lib/ai/model-catalog-availability.ts", "classifyCatalogModel", "catalog classifier");
must("src/lib/ai/model-catalog-availability.ts", "listUserSelectableCatalogModels", "user selectable filter");
must("src/lib/ai/model-catalog-availability.ts", "HIDDEN_FROM_USER_IDS", "hidden model ids");
must("src/lib/ai/model-catalog-availability.ts", "anthropicEnvDisableInstruction", "anthropic env hint");
must("src/lib/ai/routing-smoke-preview.ts", "previewAllRoutingModes", "routing preview");
must("src/lib/ai/routing-smoke-preview.ts", "ROUTING_SMOKE_DISCLAIMER", "routing disclaimer");
must("src/app/api/admin/model-catalog-health/route.ts", "buildCatalogAvailabilityReport", "admin catalog API");
must("src/components/admin/admin-provider-health-panel.tsx", "model-catalog-health", "admin catalog UI");
must("src/components/admin/admin-provider-health-panel.tsx", "Model catalog (admin)", "catalog table");
must("src/app/api/admin/model-catalog-health/route.ts", "recentModelDecisions", "admin model decision records");
must("src/lib/ai/provider-fallback.ts", "gpt-5-4-mini", "discuss fallback mini");
must("scripts/smoke-models-routing.ts", "dry-run", "routing smoke dry run");

const data = fs.readFileSync(path.join(root, "src/lib/data.ts"), "utf8");
if (!/composer-latest[\s\S]*available: false/.test(data)) {
  errors.push("composer-latest should be unavailable in catalog");
} else ok.push("composer-latest disabled in catalog");

console.log("\n=== verify:admin-provider-health ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

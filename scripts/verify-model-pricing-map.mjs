#!/usr/bin/env node
/** Static audit for model pricing map — no live API calls. */
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

must("src/lib/credits/model-pricing-map.ts", "MODEL_PRICING_MAP", "pricing map");
must("src/lib/credits/model-pricing-map.ts", "claude-opus-4-6", "opus 4.6 pricing");
must("src/lib/credits/model-pricing-map.ts", "calculateTokenProviderCostUsd", "cost calculator");
must("src/lib/credits/model-pricing-map.ts", "CATALOG_ALIAS_NOTES", "catalog alias notes");
must("src/lib/credits/model-pricing-map.ts", "estimated: true", "estimated pricing labels");
must("src/lib/credits/token-cost.ts", "calculateTokenProviderCostUsd", "token-cost uses pricing map");
must("src/lib/ai/model-smoke-test.ts", "pricing_source", "smoke pricing source field");
must("src/lib/ai/model-catalog.ts", "claude-opus-4-7", "opus catalog alias");

const pricing = fs.readFileSync(path.join(root, "src/lib/credits/model-pricing-map.ts"), "utf8");
const opus = /claude-opus-4-6[\s\S]*?inputPerMillion:\s*(\d+)/.exec(pricing);
const sonnet = /claude-sonnet-4-5[\s\S]*?inputPerMillion:\s*(\d+)/.exec(pricing);
if (opus && sonnet && Number(opus[1]) <= Number(sonnet[1])) {
  errors.push("opus input rate must exceed sonnet input rate");
} else if (opus && sonnet) {
  ok.push("opus priced higher than sonnet");
}

console.log("\n=== verify:model-pricing-map ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

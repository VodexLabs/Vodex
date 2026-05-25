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

must("src/app/api/chat/route.ts", "routeMainModelSpec", "chat uses model mix");
must("src/app/api/chat/route.ts", "selected_model_unavailable", "selected model unavailable message");
must("src/lib/ai/model-mix-router.ts", "user_selected_main_heavy_helper_cheap", "user selected policy");

console.log("\n=== verify:selected-model-policy ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

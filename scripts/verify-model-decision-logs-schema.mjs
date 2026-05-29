#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mig = fs.readFileSync(
  path.join(root, "supabase/migrations/20260703120000_p05_build_events_model_decision_repair.sql"),
  "utf8",
);
const log = fs.readFileSync(path.join(root, "src/lib/ai/model-decision-log.ts"), "utf8");
const errors = [];
if (!mig.includes("actual_model_id")) errors.push("migration missing actual_model_id");
if (!log.includes("actual_model_id")) errors.push("model-decision-log missing actual_model_id");
if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}
console.log("✓ model_decision_logs actual_model_id aligned");

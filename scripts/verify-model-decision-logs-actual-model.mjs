#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const log = fs.readFileSync(path.join(root, "src/lib/ai/model-decision-log.ts"), "utf8");
const call = fs.readFileSync(path.join(root, "src/lib/ai/provider-call.ts"), "utf8");
for (const field of ["user_selected_model_label", "actual_model_id"]) {
  if (!log.includes(field)) {
    console.error(`✗ model-decision-log missing ${field}`);
    process.exit(1);
  }
  if (!call.includes(field)) {
    console.error(`✗ provider-call missing ${field} in decision log`);
    process.exit(1);
  }
}
console.log("✓ model decision logs include actual model fields");

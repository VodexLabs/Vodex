#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error("✗ missing", rel);
    failed = true;
  } else console.log("✓", rel);
}

[
  "src/lib/build/generated-ui-repair-pass.ts",
  "src/lib/build/generated-ui-quality-checker.ts",
].forEach(mustExist);

const repair = fs.readFileSync(path.join(root, "src/lib/build/generated-ui-repair-pass.ts"), "utf8");
if (!repair.includes("too basic")) {
  console.error("✗ premium repair prompt missing upgrade instruction");
  failed = true;
} else console.log("✓ premium repair wording");

const pipeline = fs.readFileSync(path.join(root, "src/lib/build/build-pipeline.ts"), "utf8");
if (!pipeline.includes("buildPremiumUiRepairPrompt")) {
  console.error("✗ pipeline missing premium UI repair");
  failed = true;
} else console.log("✓ pipeline wires premium repair");

process.exit(failed ? 1 : 0);

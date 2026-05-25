#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;

function mustInclude(file, needle, label) {
  if (!fs.readFileSync(path.join(root, file), "utf8").includes(needle)) {
    console.error(`✗ ${label}`);
    failed = true;
  } else console.log(`✓ ${label}`);
}

mustInclude("src/lib/build/ui-quality-contract.ts", "Next", "Next.js banned in contract");
mustInclude("src/lib/build/stage-prompts.ts", "No framework names", "framework ban in file payload");
mustInclude("src/lib/build/generated-ui-quality-checker.ts", "framework_label_in_ui", "framework checker");

process.exit(failed ? 1 : 0);

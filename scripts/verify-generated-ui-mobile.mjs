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

mustInclude("src/lib/build/generated-app-design-system.ts", "sm:", "mobile breakpoints in design system");
mustInclude("src/lib/build/stage-prompts.ts", "mobile-first", "mobile-first in prompts");
mustInclude("src/lib/generation/ui-quality-spec.ts", "responsive", "responsive in quality spec");

process.exit(failed ? 1 : 0);

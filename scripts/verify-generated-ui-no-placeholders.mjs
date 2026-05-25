#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;

function mustInclude(file, needle, label) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  if (!text.includes(needle)) {
    console.error(`✗ ${label}`);
    failed = true;
  } else console.log(`✓ ${label}`);
}

mustInclude("src/lib/build/ui-quality-contract.ts", "TODO", "TODO banned");
mustInclude("src/lib/build/stage-prompts.ts", "coming soon", "coming soon banned in prompts");
mustInclude("src/lib/generation/ui-quality-spec.ts", "coming soon", "ui spec bans coming soon");
mustInclude("src/lib/build/generated-ui-quality-checker.ts", "welcome_plus_plain_cards", "blocks welcome+cards");

process.exit(failed ? 1 : 0);

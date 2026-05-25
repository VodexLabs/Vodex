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

must("src/components/chat/chat-view.tsx", "discussInputHintLabel", "chat discuss hint");
must("src/components/chat/message-cost-header.tsx", "discussFlatCreditsUsedLabel", "assistant header credits");
must("src/components/layout/sidebar.tsx", "formatCreditAmount", "sidebar credit format");
must("src/lib/credits/canonical-credit-display.ts", "planAllowance", "plan allowance display");

console.log("\n=== verify:user-credit-ui ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

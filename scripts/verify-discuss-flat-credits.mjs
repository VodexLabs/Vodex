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

must("src/lib/billing/credit-pricing.ts", "DISCUSS_FLAT_CREDITS = 0.4", "flat discuss constant");
must("src/lib/billing/credit-pricing.ts", "discussInputHintLabel", "discuss input hint");
must("src/lib/credits/credit-pricing.ts", "DISCUSS_FLAT_CREDITS", "discuss charge uses flat");
must("src/lib/billing/credit-profit-guard.ts", "discuss_flat_0.4", "discuss quote flat");
must("src/components/chat/chat-view.tsx", "discussInputHintLabel", "chat discuss label");
must("src/components/chat/message-cost-header.tsx", "discussFlatCreditsUsedLabel", "message cost label");
must("src/app/api/chat/route.ts", "DISCUSS_FLAT_CREDITS", "chat route flat discuss");

console.log("\n=== verify:discuss-flat-credits ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

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

must("src/lib/billing/credit-pricing.ts", "CREATE_QUESTION_FLAT_CREDITS = 0.8", "create question constant");
must("src/lib/billing/credit-pricing.ts", "createQuestionInputHintLabel", "create question hint");
must("src/lib/billing/credit-profit-guard.ts", "quoteCreateQuestionCost", "create question quote");
must("src/lib/billing/credit-profit-guard.ts", "quoteCreateQuestionCost", "create question quote fn");
must("src/lib/credits/credit-pricing.ts", "quoteCreateQuestionCost", "charge uses create question quote");
must("src/app/api/chat/route.ts", "chargeMode === \"create_question\"", "chat route create question charge mode");
must("src/lib/chat/create-chat-transport.ts", "createQuestion", "transport create question flag");
must("src/components/create/create-intent-step.tsx", "createQuestionInputHintLabel", "create UI hint");
must("src/lib/billing/credit-pricing.ts", "DISCUSS_FLAT_CREDITS = 0.4", "discuss still 0.4");

console.log("\n=== verify:create-question-pricing ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

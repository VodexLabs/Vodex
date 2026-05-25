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

must("src/lib/ai/preflight-server.ts", "getChargeTokensProbeCached", "billing probe in preflight");
must("src/app/api/chat/route.ts", "getChargeTokensProbeCached", "chat billing gate");
must("src/lib/credits/provider-spend-guard.ts", "getChargeTokensProbeCached", "spend guard");
must("src/lib/runtime/runtime-schema-contract.ts", "CRITICAL_RPC_NAMES", "schema contract RPCs");

console.log("\n=== verify:ai-runtime-preflight ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

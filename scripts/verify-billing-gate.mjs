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

must("src/lib/db/probe-charge-tokens-rpc.ts", "isCanonicalChargeTokensArgs", "canonical probe");
must("src/lib/db/charge-probe-cache.ts", "probeChargeTokensRpcDetailed", "cached probe");
must("src/app/api/chat/route.ts", "chargeProbe.ok", "chat billing gate");
must("src/lib/ai/preflight-server.ts", "chargeProbe.ok", "preflight gate");

console.log("\n=== verify:billing-gate ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

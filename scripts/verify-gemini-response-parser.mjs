#!/usr/bin/env node
/** Static checks for Gemini empty-response handling — no live API calls. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

function mustInclude(rel, needle, label) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`missing ${rel}`);
    return;
  }
  if (!fs.readFileSync(full, "utf8").includes(needle)) errors.push(`${rel} missing ${label}`);
  else ok.push(label);
}

mustInclude("src/lib/ai/gemini-generate-options.ts", "isGeminiThinkingOnlyApiModel", "thinking-only model detection");
mustInclude("src/lib/ai/gemini-generate-options.ts", "googleSmokeMaxOutputTokens", "smoke output cap helper");
mustInclude("src/lib/ai/gemini-generate-options.ts", "extractGenerateTextContent", "text extraction helper");
mustInclude("src/lib/ai/gemini-generate-options.ts", "classifyGeminiEmptyResponse", "empty response classifier");
mustInclude("src/lib/ai/model-smoke-test.ts", "withGoogleProviderOptions", "smoke test uses Gemini options");
mustInclude("src/lib/ai/model-smoke-test.ts", "empty_provider_response", "smoke empty reason code");
mustInclude("src/lib/ai/provider-call.ts", "withGoogleProviderOptions", "provider call uses Gemini options");
mustInclude("src/lib/ai/provider-call.ts", "routeMainModelSpec", "provider call uses model mix");
mustInclude("src/lib/ai/model-smoke-test.ts", "optimizationEstimates", "smoke optimization estimates");

console.log("\n=== verify:gemini-response-parser ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

#!/usr/bin/env node
/** Admin-only Anthropic tiny smoke — Haiku first, Sonnet fallback. No user credits. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { toApiModelId } from "../src/lib/ai/model-catalog";
import { estimateTokenProviderCostUsd } from "../src/lib/credits/token-cost";
import { getProviderStatus, isProviderSelectable } from "../src/lib/ai/provider-availability";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT = ".dreamos-anthropic-smoke-report.json";
const PROMPT = "What is DreamOS86 in one short sentence?";
const MAX_OUT = 40;
const CAP_USD = 0.02;

function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

function classifyFailure(err: unknown): string {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (/ai_provider_disable_anthropic|disabled_by_env/.test(msg)) return "disabled_by_env";
  if (/not configured|missing|no key/.test(msg)) return "missing_key";
  if (/401|403|auth|invalid.*key|api key/.test(msg)) return "invalid_key";
  if (/quota|billing|credit|insufficient/.test(msg)) return "provider_budget_exhausted";
  if (/model_not_found|not found|deprecated|no longer available/.test(msg)) return "model_not_available";
  if (/mapping|unsupported api/.test(msg)) return "model_mapping_error";
  if (/timeout|network|fetch|econn|enotfound/.test(msg)) return "network_error";
  return "provider_unavailable";
}

async function tryModel(catalogId: string) {
  const apiModelId = toApiModelId(catalogId);
  const started = performance.now();
  const result = await generateText({
    model: anthropic(apiModelId),
    prompt: PROMPT,
    maxOutputTokens: MAX_OUT,
    temperature: 0.2,
  });
  const text = result.text?.trim() ?? "";
  const inTok = result.usage?.inputTokens ?? null;
  const outTok = result.usage?.outputTokens ?? null;
  const cost =
    inTok != null && outTok != null
      ? estimateTokenProviderCostUsd(catalogId, inTok, outTok)
      : null;
  return {
    catalogId,
    apiModelId,
    status: text ? ("success" as const) : ("failed" as const),
    failureClass: text ? null : "empty_provider_response",
    text,
    inputTokens: inTok,
    outputTokens: outTok,
    providerCostUsd: cost,
    latencyMs: Math.round(performance.now() - started),
  };
}

async function main() {
  console.log("\n=== smoke:anthropic-tiny (admin only) ===\n");
  loadEnvLocal();
  delete process.env.AI_PROVIDER_DISABLE_ANTHROPIC;

  const disableFlag = process.env.AI_PROVIDER_DISABLE_ANTHROPIC;
  const keyPresent = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  console.log("AI_PROVIDER_DISABLE_ANTHROPIC in process:", disableFlag ?? "(unset)");
  console.log("Anthropic key present:", keyPresent ? "yes" : "no");
  console.log("Provider selectable:", isProviderSelectable("anthropic"));
  console.log("Provider status:", getProviderStatus("anthropic").status);

  if (disableFlag === "1") {
    const report = {
      runAt: new Date().toISOString(),
      status: "skipped",
      failureClass: "disabled_by_env",
      userCreditsCharged: 0,
    };
    fs.writeFileSync(path.join(root, REPORT), JSON.stringify(report, null, 2));
    console.error("\n✗ Still disabled_by_env — unset AI_PROVIDER_DISABLE_ANTHROPIC and restart shell\n");
    process.exit(1);
  }

  if (!keyPresent) {
    console.error("\n✗ missing_key\n");
    process.exit(1);
  }

  const candidates = ["claude-haiku-4-5", "claude-sonnet-4-5"];
  let last: Awaited<ReturnType<typeof tryModel>> | null = null;
  let lastErr: { failureClass: string; message: string } | null = null;

  for (const id of candidates) {
    console.log(`\nTrying ${id}…`);
    try {
      const row = await tryModel(id);
      last = row;
      if (row.status === "success") {
        if ((row.providerCostUsd ?? 0) > CAP_USD) {
          console.error(`✗ Cost $${row.providerCostUsd} exceeds cap $${CAP_USD}`);
          process.exit(1);
        }
        const report = {
          runAt: new Date().toISOString(),
          prompt: PROMPT,
          maxOutputTokens: MAX_OUT,
          userCreditsCharged: 0,
          ...row,
        };
        fs.writeFileSync(path.join(root, REPORT), JSON.stringify(report, null, 2));
        console.log("\n✓ Anthropic smoke passed");
        console.log("Model:", row.catalogId, "→", row.apiModelId);
        console.log("Tokens:", row.inputTokens, "/", row.outputTokens);
        console.log("Cost USD:", row.providerCostUsd?.toFixed(6));
        console.log("Latency ms:", row.latencyMs);
        console.log("Response:", row.text.slice(0, 120));
        process.exit(0);
      }
      lastErr = { failureClass: row.failureClass ?? "empty_provider_response", message: "empty text" };
    } catch (e) {
      const failureClass = classifyFailure(e);
      lastErr = { failureClass, message: e instanceof Error ? e.message.slice(0, 200) : String(e) };
      console.log(`  failed: ${failureClass}`);
      if (id === candidates[0] && failureClass !== "model_not_available") {
        break;
      }
    }
  }

  const report = {
    runAt: new Date().toISOString(),
    status: "failed",
    failureClass: lastErr?.failureClass ?? "provider_unavailable",
    message: lastErr?.message,
    lastAttempt: last,
    userCreditsCharged: 0,
  };
  fs.writeFileSync(path.join(root, REPORT), JSON.stringify(report, null, 2));
  console.error("\n✗ Anthropic smoke failed:", report.failureClass);
  process.exit(1);
}

main().catch((e) => {
  console.error("✗", e instanceof Error ? e.message : e);
  process.exit(1);
});

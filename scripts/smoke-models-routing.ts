#!/usr/bin/env node
/**
 * Admin routing smoke — dry-run by default; optional --live-small for tiny provider probes.
 * No build generation, no user credits, no xAI/Grok.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import {
  previewAllRoutingModes,
  routingSmokePreflight,
  ROUTING_SMOKE_DISCLAIMER,
  type RoutingSmokeMode,
} from "../src/lib/ai/routing-smoke-preview";
import { withGoogleProviderOptions } from "../src/lib/ai/gemini-generate-options";
import { googleGenerativeApiKey } from "../src/lib/llm/env-keys";
import { estimateTokenProviderCostUsd } from "../src/lib/credits/token-cost";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT = ".dreamos-model-routing-smoke-report.json";
const LIVE_CAP_USD = 0.05;
const LIVE_PROMPT = "Reply with one short sentence about DreamOS86.";
const LIVE_MAX_OUT = 48;

function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    if (!process.env[key]) process.env[key] = t.slice(i + 1).trim();
  }
}

function resolveLlm(apiModelId: string) {
  if (apiModelId.startsWith("gemini")) {
    const key = googleGenerativeApiKey();
    if (!key) throw new Error("Gemini key missing");
    return createGoogleGenerativeAI({ apiKey: key })(apiModelId);
  }
  if (apiModelId.startsWith("claude")) {
    if (process.env.AI_PROVIDER_DISABLE_ANTHROPIC === "1") {
      throw new Error("Anthropic disabled by AI_PROVIDER_DISABLE_ANTHROPIC=1");
    }
    if (!process.env.ANTHROPIC_API_KEY?.trim()) throw new Error("Anthropic key missing");
    return anthropic(apiModelId);
  }
  if (apiModelId.startsWith("gpt")) {
    if (!process.env.OPENAI_API_KEY?.trim()) throw new Error("OpenAI key missing");
    return openai(apiModelId);
  }
  throw new Error(`Unsupported API model: ${apiModelId}`);
}

async function liveProbe(mode: RoutingSmokeMode, catalogModelId: string, apiModelId: string) {
  const started = performance.now();
  const result = await generateText(
    withGoogleProviderOptions(apiModelId, {
      model: resolveLlm(apiModelId),
      prompt: LIVE_PROMPT,
      maxOutputTokens: LIVE_MAX_OUT,
      temperature: 0.2,
    }),
  );
  const text = result.text?.trim() ?? "";
  const inTok = result.usage?.inputTokens ?? 0;
  const outTok = result.usage?.outputTokens ?? 0;
  const cost = estimateTokenProviderCostUsd(catalogModelId, inTok, outTok);
  return {
    mode,
    status: text ? "success" : "failed",
    latencyMs: Math.round(performance.now() - started),
    inputTokens: inTok,
    outputTokens: outTok,
    providerCostUsd: cost,
    responsePreview: text.slice(0, 120),
  };
}

async function main() {
  const live = process.argv.includes("--live-small");
  console.log("\n=== smoke:models-routing (admin routing preview) ===\n");
  console.log(ROUTING_SMOKE_DISCLAIMER);
  console.log("");

  loadEnvLocal();

  const preflight = routingSmokePreflight();
  if (!preflight.ok) {
    console.warn("Preflight blockers:", preflight.blockers.join("; "));
  }

  const rows = previewAllRoutingModes();
  console.log("--- Dry-run routing decisions ---");
  for (const r of rows) {
    console.log(`\n[${r.mode}] op=${r.operationType}`);
    console.log(`  model: ${r.selectedCatalogModelId} → API ${r.apiModelId} (${r.provider})`);
    console.log(`  reason: ${r.routeReason}`);
    console.log(`  cost bucket: ${r.estimatedCostBucket} · tier: ${r.orchestrationTier}`);
    if (r.fallbackApplied) console.log(`  fallback: ${r.fallbackReason}`);
    console.log(`  policy: ${r.policyNote}`);
  }

  const report: Record<string, unknown> = {
    runAt: new Date().toISOString(),
    mode: live ? "live-small" : "dry-run",
    disclaimer: ROUTING_SMOKE_DISCLAIMER,
    userCreditsCharged: 0,
    preflight,
    routing: rows,
    liveProbes: [] as unknown[],
    totalProviderSpendUsd: 0,
  };

  if (live) {
    if (process.env.AI_PROVIDER_DISABLE_ANTHROPIC === "1") {
      console.log("\nAnthropic disabled — live probes skip Claude routes and use routed fallback models only.");
    }
    let spend = 0;
    const probes = [];
    for (const r of rows) {
      if (r.apiModelId.startsWith("grok")) continue;
      if (r.provider === "anthropic" && process.env.AI_PROVIDER_DISABLE_ANTHROPIC === "1") {
        probes.push({ mode: r.mode, status: "skipped", reason: "disabled_by_env" });
        continue;
      }
      try {
        const probe = await liveProbe(r.mode, r.selectedCatalogModelId, r.apiModelId);
        spend += probe.providerCostUsd;
        probes.push(probe);
        if (spend > LIVE_CAP_USD) throw new Error(`Live spend $${spend.toFixed(4)} exceeded cap $${LIVE_CAP_USD}`);
      } catch (e) {
        probes.push({
          mode: r.mode,
          status: "failed",
          reason: e instanceof Error ? e.message : String(e),
        });
      }
    }
    report.liveProbes = probes;
    report.totalProviderSpendUsd = Math.round(spend * 1_000_000) / 1_000_000;
    console.log(`\n--- Live-small probes (${probes.length}) ---`);
    console.log(`Total provider spend: $${(report.totalProviderSpendUsd as number).toFixed(6)}`);
    for (const p of probes) console.log(p);
  } else {
    console.log("\n(dry-run — pass --live-small for one tiny prompt per route under $0.05 cap)");
  }

  fs.writeFileSync(path.join(root, REPORT), JSON.stringify(report, null, 2));
  console.log(`\n✓ Wrote ${REPORT}\n`);
}

main().catch((e) => {
  console.error("✗", e instanceof Error ? e.message : e);
  process.exit(1);
});

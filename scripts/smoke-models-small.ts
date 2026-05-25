#!/usr/bin/env node
/**
 * Admin-only multi-model smoke test — raw provider + product-aware modes.
 * Does NOT use /api/chat, does NOT charge user credits.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SMOKE_REPORT_FILENAME,
  evaluateModelEligibility,
  listSmokeCatalogModels,
  mergeSmokeRuns,
  projectSmokeCostUsd,
  runModelSmokeTest,
  type CombinedModelSmokeReport,
  type ModelSmokeRun,
  type SmokeModelRow,
  type SmokeRunMode,
} from "../src/lib/ai/model-smoke-test";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = path.join(root, SMOKE_REPORT_FILENAME);

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

function parseMode(argv: string[]): SmokeRunMode {
  const idx = argv.indexOf("--mode");
  if (idx >= 0 && argv[idx + 1]) {
    const m = argv[idx + 1]!;
    if (m === "raw_provider_smoke" || m === "product_aware_smoke") return m;
    throw new Error(`Unknown mode: ${m}. Use raw_provider_smoke or product_aware_smoke`);
  }
  return "raw_provider_smoke";
}

function loadExistingReport(): CombinedModelSmokeReport | null {
  if (!fs.existsSync(reportPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(reportPath, "utf8")) as CombinedModelSmokeReport & {
      rows?: SmokeModelRow[];
    };
    if (parsed.rawProviderSmoke || parsed.productAwareSmoke) return parsed;
    if (parsed.rows) {
      return {
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
        rawProviderSmoke: parsed as unknown as ModelSmokeRun,
        productAwareSmoke: null,
        routingNotes: parsed.routingNotes,
        userCreditsCharged: 0,
        confirmation: parsed.confirmation ?? "",
      };
    }
    return parsed;
  } catch {
    return null;
  }
}

function pad(s: string | number | null | undefined, w: number): string {
  const str = s == null ? "—" : String(s);
  return str.length >= w ? str.slice(0, w - 1) + "…" : str.padEnd(w);
}

function printTable(title: string, rows: SmokeModelRow[]) {
  console.log(`\n--- ${title} ---`);
  const cols = [
    ["provider", 10],
    ["model_id", 22],
    ["status", 8],
    ["in_tok", 7],
    ["out_tok", 8],
    ["cost_usd", 10],
    ["pricing", 12],
    ["latency_ms", 11],
    ["product_ok", 10],
    ["recommended", 12],
  ] as const;

  console.log(cols.map(([h, w]) => pad(h, w)).join(" "));
  console.log(cols.map(([, w]) => "-".repeat(w)).join(" "));

  for (const r of rows) {
    console.log(
      [
        pad(r.provider, 10),
        pad(r.model_id, 22),
        pad(r.status, 8),
        pad(r.input_tokens, 7),
        pad(r.output_tokens, 8),
        pad(r.provider_cost_usd != null ? r.provider_cost_usd.toFixed(6) : null, 10),
        pad(r.pricing_source, 12),
        pad(r.latency_ms, 11),
        pad(
          r.product_answer_correct == null ? "—" : r.product_answer_correct ? "yes" : "no",
          10,
        ),
        pad(r.recommended_use, 12),
      ].join(" "),
    );
    if (r.status !== "success") {
      console.log(`  └ reason: ${r.skip_or_error_reason ?? "—"}`);
    } else if (r.response_text) {
      console.log(`  └ response: ${r.response_text.slice(0, 120)}${r.response_text.length > 120 ? "…" : ""}`);
      if (r.quality_note) console.log(`  └ quality: ${r.quality_note}`);
    }
  }
}

function printSummary(mode: SmokeRunMode, run: ModelSmokeRun, report: CombinedModelSmokeReport) {
  console.log("\n--- Summary ---");
  console.log(`Mode: ${mode}`);
  console.log(`Run at: ${run.runAt}`);
  console.log(`Prompt: "${run.prompt}"`);
  console.log(`Product context: ${run.systemContextIncluded ? "yes" : "no"}`);
  console.log(`This run spend: $${run.totalProviderSpendUsd.toFixed(6)}`);
  const combinedSpend =
    (report.rawProviderSmoke?.totalProviderSpendUsd ?? 0) +
    (report.productAwareSmoke?.totalProviderSpendUsd ?? 0);
  console.log(`Combined spend (both modes): $${combinedSpend.toFixed(6)}`);
  console.log(`Tested: ${run.testedCount} | Skipped: ${run.skippedCount} | Failed: ${run.failedCount}`);
  console.log(`User credits charged: ${report.userCreditsCharged}`);
  console.log(report.confirmation);

  const n = report.routingNotes;
  console.log("\n--- Routing notes (admin, deterministic) ---");
  console.log(`Cheapest reliable discuss (product-aware): ${n.cheapestReliableDiscuss ?? "—"}`);
  console.log(`Cheap planner (not Sonnet-from-smoke): ${n.bestPlanning ?? "—"}`);
  console.log(`Heavy implementation: ${n.bestHeavyImplementation ?? "—"}`);
  console.log(
    `Unavailable providers: ${n.unavailableProviders.length ? n.unavailableProviders.join(", ") : "none"}`,
  );
  if (n.modelsToAvoid.length) {
    console.log("Models to avoid:");
    for (const a of n.modelsToAvoid.slice(0, 10)) {
      console.log(`  - ${a.model_id}: ${a.reason}`);
    }
  }
}

async function main() {
  const mode = parseMode(process.argv);
  console.log(`\n=== smoke:models-small (${mode}) ===\n`);

  loadEnvLocal();

  const approve =
    process.argv.includes("--approve-over-budget") ||
    process.env.DREAMOS_MODEL_SMOKE_APPROVED === "1";

  const catalog = listSmokeCatalogModels();
  const existing = loadExistingReport();
  const priorSpend =
    mode === "product_aware_smoke"
      ? (existing?.rawProviderSmoke?.totalProviderSpendUsd ?? 0)
      : (existing?.productAwareSmoke?.totalProviderSpendUsd ?? 0);
  const projected = projectSmokeCostUsd(catalog, mode);
  const eligible = catalog.filter((m) => evaluateModelEligibility(m).eligible);

  console.log(`Catalog models: ${catalog.length}`);
  console.log(`Eligible to test: ${eligible.length}`);
  console.log(`Projected this run: $${projected.toFixed(6)}`);
  console.log(`Prior other-mode spend: $${priorSpend.toFixed(6)}`);
  console.log(`Combined projected: $${(projected + priorSpend).toFixed(6)} (cap $0.05)`);

  if (projected + priorSpend > 0.05 && !approve) {
    console.error(
      "\n✗ Combined projected spend exceeds $0.05. Set DREAMOS_MODEL_SMOKE_APPROVED=1 or pass --approve-over-budget.\n",
    );
    process.exit(1);
  }

  const run = await runModelSmokeTest({
    mode,
    approveOverBudget: approve,
    priorSpendUsd: priorSpend,
    onProgress: ({ modelId, index, total, mode: m }) => {
      console.log(`\n[${index}/${total}] (${m}) Testing ${modelId}…`);
    },
  });

  const modelsById = new Map(catalog.map((m) => [m.id, m]));
  const report = mergeSmokeRuns(
    mode === "raw_provider_smoke" ? run : (existing?.rawProviderSmoke ?? null),
    mode === "product_aware_smoke" ? run : (existing?.productAwareSmoke ?? null),
    modelsById,
  );

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\n✓ Wrote ${SMOKE_REPORT_FILENAME}`);

  if (report.rawProviderSmoke) printTable("Raw provider smoke", report.rawProviderSmoke.rows);
  if (report.productAwareSmoke) printTable("Product-aware smoke", report.productAwareSmoke.rows);

  printSummary(mode, run, report);

  const failed = run.failedCount;
  if (failed) {
    console.log(`\n⚠ Completed with ${failed} provider failure(s)\n`);
  } else {
    console.log("\n✓ smoke:models-small PASSED\n");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("✗", e instanceof Error ? e.message : e);
  process.exit(1);
});

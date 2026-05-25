#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = path.join(root, ".dreamos-model-smoke-report.json");
const errors = [];
const ok = [];

function must(cond, msg) {
  if (!cond) errors.push(msg);
  else ok.push(msg);
}

const src = fs.readFileSync(path.join(root, "src/lib/ai/model-smoke-test.ts"), "utf8");
must(src.includes("catalog_model_id"), "smoke rows include catalog_model_id");
must(src.includes("api_model_id"), "smoke rows include api_model_id");
must(src.includes("product_aware_smoke"), "product-aware smoke mode");
must(src.includes("raw_provider_smoke"), "raw provider smoke mode");
must(src.includes("product_answer_correct"), "product answer scoring");
must(src.includes("pricing_source"), "smoke pricing source");
must(src.includes("disabled_by_env"), "smoke skip reason disabled_by_env");
must(src.includes("getSmokeProductSystemContext"), "smoke uses chat product context");
must(src.includes("userCreditsCharged: 0"), "smoke confirms no user credits");

if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  must(report.userCreditsCharged === 0, "report userCreditsCharged is 0");
  must(report.rawProviderSmoke || report.productAwareSmoke || report.rows, "report has smoke runs");

  const runs = [
    report.rawProviderSmoke,
    report.productAwareSmoke,
    report.rows ? report : null,
  ].filter(Boolean);

  for (const run of runs) {
    for (const row of run.rows ?? []) {
      must(row.catalog_model_id || row.model_id, "row has model id");
      must(row.status, `row ${row.catalog_model_id ?? row.model_id} has status`);
      if (row.status === "skipped") must(row.reason || row.skip_or_error_reason, `skip reason for ${row.catalog_model_id}`);
    }
  }
} else {
  ok.push("no report file yet (run npm run smoke:models-small)");
}

console.log("\n=== verify:model-smoke-report ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

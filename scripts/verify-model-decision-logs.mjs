#!/usr/bin/env node
/** Static + optional live checks for model decision log persistence. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

function must(rel, needle, label) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`missing ${rel}`);
    return;
  }
  if (!fs.readFileSync(full, "utf8").includes(needle)) errors.push(`${rel} missing ${label}`);
  else ok.push(label);
}

must("supabase/migrations/20260624180000_model_decision_logs.sql", "model_decision_logs", "migration table");
must("supabase/migrations/20260520120001_model_decision_logs_grants.sql", "service_role", "service role grants");
must("src/lib/ai/model-decision-log.ts", "model_decision_logs", "db table name in persist");
must("src/lib/ai/model-decision-log.ts", "fetchRecentModelDecisionLogsFromDb", "db fetch helper");
must("src/lib/ai/model-decision-log.ts", "hidden_from_user", "hidden from user flag");
must("src/lib/ai/provider-call.ts", "logInternalModelDecision", "provider call logs decisions");
must("src/app/api/admin/model-catalog-health/route.ts", "fetchRecentModelDecisionLogsFromDb", "admin reads db logs");

console.log("\n=== verify:model-decision-logs ===\n");
ok.forEach((m) => console.log("✓", m));
errors.forEach((m) => console.error("✗", m));
process.exit(errors.length ? 1 : 0);

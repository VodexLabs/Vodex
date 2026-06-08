#!/usr/bin/env npx tsx
/**
 * P1.3.15 — Debug preview failure for a project (CLI-safe, no Next server imports).
 *
 * Usage:
 *   npm run debug:preview-failure -- --project <uuid>
 *   npm run debug:preview-failure -- --help
 */
import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPreviewFailureCliDebug } from "../src/lib/preview/debug-preview-failure-cli";
import {
  buildSupabaseDebugEnvDiagnostic,
  formatSupabaseDebugEnvDiagnostic,
  loadCliEnv,
  resolveSupabaseServiceKey,
  resolveSupabaseUrl,
  rejectAnonKey,
} from "../src/lib/cli/supabase-debug-env";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  if (i < 0 || !process.argv[i + 1]) return null;
  return process.argv[i + 1]!;
}

function printHelp() {
  console.log(`debug:preview-failure — inspect preview build failure for a project

Usage:
  npm run debug:preview-failure -- --project <uuid>

Options:
  --project <uuid>   Project ID to inspect
  --help             Show this help

Requires env (.env.local or process):
  SUPABASE_URL (preferred) or NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY

Run npm run debug:env to inspect resolved credentials safely.
`);
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const projectId = arg("--project");
  if (!projectId) {
    console.error("Usage: npm run debug:preview-failure -- --project <uuid>");
    console.error("       npm run debug:preview-failure -- --help");
    process.exit(1);
  }

  const diag = buildSupabaseDebugEnvDiagnostic(root);

  if (diag.errors.length > 0) {
    console.error(formatSupabaseDebugEnvDiagnostic(diag));
    process.exit(1);
  }

  const env = loadCliEnv(root);
  const { url } = resolveSupabaseUrl(env);
  const { key, source: keySource } = resolveSupabaseServiceKey(env);

  if (!url || !key) {
    console.error(formatSupabaseDebugEnvDiagnostic(diag));
    process.exit(1);
  }

  const anonErr = rejectAnonKey(key, keySource);
  if (anonErr) {
    console.error(anonErr);
    console.error(formatSupabaseDebugEnvDiagnostic(diag));
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const result = await loadPreviewFailureCliDebug(admin, projectId);

  if (!result) {
    const countRes = await admin
      .from("projects")
      .select("id", { count: "exact", head: true });
    const directRes = await admin
      .from("projects")
      .select("id, name, app_name")
      .eq("id", projectId)
      .maybeSingle();

    const connectionFailed = Boolean(countRes.error || directRes.error);
    const hint = connectionFailed
      ? "Supabase query failed — check URL/key (run npm run debug:env). Ensure service role/secret key, not anon."
      : "Project UUID not in this Supabase project (connection OK).";

    console.log(
      JSON.stringify(
        {
          error: connectionFailed ? "supabase_query_failed" : "project_not_found",
          project_id: projectId,
          hint,
          env: JSON.parse(formatSupabaseDebugEnvDiagnostic(diag)),
          probe: {
            projects_table_reachable: !countRes.error,
            projects_visible_count: countRes.count,
            projects_count_error: countRes.error
              ? { message: countRes.error.message, code: countRes.error.code, details: countRes.error.details }
              : null,
            direct_lookup: directRes.data ?? null,
            direct_lookup_error: directRes.error
              ? { message: directRes.error.message, code: directRes.error.code, details: directRes.error.details }
              : null,
          },
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const { classification: _c, ...output } = result;
  console.log(
    JSON.stringify(
      {
        env: {
          supabaseUrl: diag.supabaseUrl,
          supabaseUrlSource: diag.supabaseUrlSource,
          keySource: diag.keySource,
          keyPreview: diag.keyPreview,
          jwtRole: diag.jwtRole,
        },
        ...output,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

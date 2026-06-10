#!/usr/bin/env npx tsx
/**
 * Detailed preview diagnostics with per-leak snippets (P1.3.33).
 * Usage: npm run debug:preview-diagnostics -- --project <uuid>
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildPreviewDiagnosticsReport } from "../src/lib/preview/build-preview-diagnostics-report";
import { downloadPreviewArtifactFile, PREVIEW_ARTIFACTS_BUCKET } from "../src/lib/imports/preview-artifact-storage";
import { rewritePreviewArtifactHtml } from "../src/lib/preview/rewrite-preview-artifact-html";
import {
  formatBootstrapLeakReport,
  sanitizePreviewBootstrapState,
  scanBootstrapLeaksDetailed,
} from "../src/lib/preview/preview-bootstrap-sanitizer";

const root = path.join(process.cwd());

function loadEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function arg(name: string, fallback: string) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}

const projectId = arg("--project", "ff55c353-aabf-479a-aaec-2138bba9d6b4");

async function main() {
  Object.assign(process.env, loadEnvLocal());
  if (!process.env.NODE_USE_SYSTEM_CA) process.env.NODE_USE_SYSTEM_CA = "1";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error("Missing Supabase credentials");
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const report = await buildPreviewDiagnosticsReport(admin, projectId);
  if (!report) {
    console.error("Project not found");
    process.exit(1);
  }

  console.log(JSON.stringify(report, null, 2));

  if (report.artifact_path) {
    const index = await downloadPreviewArtifactFile({
      admin,
      artifactPath: report.artifact_path,
      relativePath: "index.html",
    });
    if (index) {
      const stored = index.data.toString("utf8");
      const buildId = report.artifact_id ?? "unknown";
      const served = rewritePreviewArtifactHtml(stored, projectId, buildId, "/");
      const sanitized = sanitizePreviewBootstrapState(stored, projectId, "/");

      console.log("\n--- leak snippets (stored index.html) ---");
      for (const leak of scanBootstrapLeaksDetailed(stored, projectId, { file: "index.html" })) {
        console.log(`[stored_html][${leak.source}] ${leak.pattern}: ${leak.snippet}`);
      }
      console.log("\n--- leak snippets (served index.html, injections excluded) ---");
      for (const leak of scanBootstrapLeaksDetailed(served, projectId, {
        excludePlatformInjections: true,
        file: "served_html",
      })) {
        console.log(`[served_html][${leak.source}] ${leak.pattern}: ${leak.snippet}`);
      }
      console.log("\n--- sanitizer before/after (stored) ---");
      console.log(
        formatBootstrapLeakReport({
          before: stored,
          after: sanitized,
          projectId,
          label: "stored index.html",
          file: "index.html",
        }),
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env npx tsx
/** P1.3.38 — Scan all preview artifact assets for stale preview-html route leaks. */
import {
  createDiagnosticsAdmin,
  loadEnvLocal,
  resolveDiagnosticsProjectId,
} from "./lib/fetch-preview-diagnostics";
import {
  formatPreviewAssetLeakReport,
  scanPreviewArtifactLeaks,
} from "../src/lib/preview/scan-preview-artifact-leaks";

async function main() {
  const projectId = resolveDiagnosticsProjectId();
  if (!projectId) {
    process.stderr.write(
      "Missing project id — pass --project <uuid> or set READINESS_PROJECT_ID in .env.local\n",
    );
    process.exit(1);
  }

  const env = { ...process.env, ...loadEnvLocal() } as Record<string, string>;
  Object.assign(process.env, env);
  const admin = createDiagnosticsAdmin(env);

  const report = await scanPreviewArtifactLeaks(admin, projectId);
  if (!report) {
    process.stderr.write(`Project not found: ${projectId}\n`);
    process.exit(1);
  }

  process.stdout.write(`${formatPreviewAssetLeakReport(report)}\n`);

  if (report.served_leak_count > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});

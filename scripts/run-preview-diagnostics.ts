#!/usr/bin/env npx tsx
/**
 * Runtime preview diagnostics for production validation.
 * Usage: npm run verify:preview-diagnostics -- --project <uuid>
 */
import {
  isPreviewDiagnosticsPass,
  loadPreviewDiagnosticsReport,
  resolveDiagnosticsProjectId,
} from "./lib/fetch-preview-diagnostics";

const projectId = resolveDiagnosticsProjectId();

async function main() {
  if (!projectId) {
    console.error("✗ Missing project id — pass --project <uuid> or set READINESS_PROJECT_ID");
    process.exit(1);
  }

  const report = await loadPreviewDiagnosticsReport(projectId);
  if (!report) {
    console.error(`✗ Project not found: ${projectId}`);
    process.exit(1);
  }

  const pass = isPreviewDiagnosticsPass(report);
  console.log(JSON.stringify(report, null, 2));
  console.log(
    pass
      ? `\n✓ PASS — renderable, iframe_embeddable, 0 leaks, rebuild_required=false`
      : `\n✗ FAIL — renderable=${report.preview_renderable}, iframe_embeddable=${report.iframe_embeddable}, rebuild_required=${report.rebuild_required}, unsafe=${report.unsafe_path_count}, hydration=${report.hydration_path_count}, iframe_block=${report.iframe_block_reason ?? "none"}, issues=${report.issues.join("; ") || "none"}`,
  );
  if (!pass) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

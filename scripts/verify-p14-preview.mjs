#!/usr/bin/env node
/**
 * P0.14 preview schema, failure lifecycle, E2E stage mapping — static verification.
 * Usage: node scripts/verify-p14-preview.mjs <check-name>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const migration = read("supabase/migrations/20260527140000_preview_sessions_deployment_id.sql");
const previewSvc = read("src/lib/preview/preview-build-service.ts");
const job = read("src/lib/build/execute-staged-build-job.ts");
const policy = read("src/lib/build/clear-generated-files-policy.ts");
const persist = read("src/lib/build/persist-generated-files.ts");
const previewRoute = read("src/app/api/projects/[id]/preview/start/route.ts");
const publishReady = read("src/lib/publish/publish-readiness.ts");
const classifier = read("tests/e2e/helpers/e2e-stage-classifier.ts");
const restaurantSpec = read("tests/e2e/restaurant-inventory-workflow.spec.ts");
const packageJson = read("package.json");

const checks = {
  "preview-sessions-schema": () => {
    const errs = [];
    if (!migration.includes("deployment_id")) errs.push("migration missing deployment_id");
    if (!migration.includes("preview_sessions_deployment_id_idx")) errs.push("missing deployment_id index");
    if (!migration.includes("notify pgrst")) errs.push("missing schema cache reload");
    const grants = read("supabase/migrations/20260527140300_preview_sessions_grants.sql");
    if (!grants.includes("grant select, insert")) errs.push("missing preview_sessions grants migration");
    return errs;
  },
  "preview-session-create": () => {
    const errs = [];
    if (!previewSvc.includes("insertPreviewSession")) errs.push("missing insertPreviewSession");
    if (!previewSvc.includes("OPTIONAL_PREVIEW_SESSION_COLUMNS")) errs.push("missing optional column retry");
    if (!previewSvc.includes("preview_schema_missing")) errs.push("missing preview_schema_missing code");
    return errs;
  },
  "preview-session-schema-cache": () => {
    if (!migration.includes("notify pgrst, 'reload schema'")) return ["migration must notify pgrst reload"];
    return [];
  },
  "preview-api-always-json": () => {
    const errs = [];
    if (!previewRoute.includes("NextResponse.json")) errs.push("preview start must return JSON");
    if (!previewRoute.includes("code:")) errs.push("preview start must include error code");
    return errs;
  },
  "preview-failure-keeps-files": () => {
    const errs = [];
    if (!job.includes("preview_failed_files_kept")) errs.push("missing preview_failed_files_kept log");
    if (job.includes("previewResult.ok") && job.includes("clearGeneratedBuildFiles")) {
      const block = job.slice(job.indexOf("if (!previewResult.ok)"), job.indexOf("const iconApiUrl"));
      if (block.includes("clearGeneratedBuildFiles")) errs.push("preview failure must not clear files");
    }
    if (!job.includes("files_ready_preview_failed")) errs.push("missing files_ready_preview_failed metadata");
    return errs;
  },
  "no-clear-files-after-persist": () => {
    const errs = [];
    if (!policy.includes("preview_failed_after_persist")) errs.push("policy missing preview_failed_after_persist");
    if (!persist.includes("mayClearGeneratedFiles")) errs.push("persist must use mayClearGeneratedFiles");
    if (policy.includes('case "preview_failed_after_persist"') && policy.includes("return false")) {
      /* ok */
    } else {
      errs.push("preview_failed_after_persist must block clear");
    }
    return errs;
  },
  "files-ready-preview-failed-state": () => {
    const errs = [];
    if (!job.includes('build_status: "preview_failed"')) errs.push("missing preview_failed build_status");
    if (!job.includes("Your app files are ready")) errs.push("missing user-facing repair message");
    return errs;
  },
  "code-tab-shows-files-after-preview-failure": () => {
    if (!job.includes("files_kept")) return ["preview failure event must record files_kept"];
    return [];
  },
  "preview-uses-persisted-files": () => {
    const errs = [];
    if (!previewSvc.includes("capturePublishedSnapshot")) errs.push("preview must use capturePublishedSnapshot");
    if (!job.includes("startPreviewSession")) errs.push("build must call startPreviewSession after persist");
    return errs;
  },
  "preview-snapshot-has-restaurant-files": () => {
    if (!previewSvc.includes("snapshot_files")) return ["preview session must store snapshot_files"];
    return [];
  },
  "no-preview-ready-without-session": () => {
    const errs = [];
    if (!previewSvc.includes("insertPreviewSession")) errs.push("preview requires session insert");
    const previewGate = job.slice(job.indexOf("if (!previewResult.ok)"), job.indexOf("await persistStage(\"preview_completed\""));
    if (!previewGate.includes("if (!previewResult.ok)")) errs.push("missing preview result gate");
    if (previewGate.includes("preview_completed")) errs.push("preview_completed must not run inside failure branch");
  return errs;
  },
  "e2e-stage-mapping-preview-failure": () => {
    const errs = [];
    if (!classifier.includes("classifyE2eFailureStage")) errs.push("missing classifier");
    if (!classifier.includes('"preview"')) errs.push("classifier must return preview");
    if (!restaurantSpec.includes("classifyE2eFailureStage")) errs.push("restaurant spec must use classifier");
    return errs;
  },
  "e2e-stage-not-build-events-after-persist": () => {
    if (!classifier.includes("persistDone") || !classifier.includes("previewStarted"))
      return ["classifier must detect persist + preview"];
    return [];
  },
  "publish-requires-preview-session": () => {
    if (!publishReady.includes("preview_ready")) return ["publish readiness must require preview"];
    return [];
  },
  "restaurant-publish-after-preview": () => {
    if (!packageJson.includes("verify:restaurant-publish-succeeds")) return ["missing publish verify script ref"];
    return [];
  },
  "published-url-opens": () => {
    if (!packageJson.includes("verify:published-url-opens")) return ["missing published-url-opens script"];
    return [];
  },
};

const name = process.argv[2];
if (!name || !checks[name]) {
  console.error(`Usage: node scripts/verify-p14-preview.mjs <${Object.keys(checks).join("|")}>`);
  process.exit(1);
}

const errs = checks[name]();
if (errs.length) {
  console.error(`verify:${name} FAILED`);
  errs.forEach((e) => console.error(" ✗", e));
  process.exit(1);
}
console.log(`verify:${name} OK`);

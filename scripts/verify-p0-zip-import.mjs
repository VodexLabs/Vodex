#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkId = process.argv[2];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function mustInclude(rel, needle, label) {
  if (!read(rel).includes(needle)) throw new Error(`${rel} missing ${label}`);
}

function mustNotInclude(rel, needle, label) {
  if (read(rel).includes(needle)) throw new Error(`${rel} should not contain ${label}`);
}

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) throw new Error(`missing ${rel}`);
}

const CHECKS = {
  "builder-credits-compact": () => {
    mustInclude("src/components/create/workspace/immersive-workspace.tsx", 'variant="compact"', "builder compact credits");
    mustInclude("src/components/credits/credits-tracker.tsx", "UnifiedCreditsCard", "unified credits card");
  },
  "no-duplicate-credits-overview": () => {
    mustNotInclude("src/components/credits/credits-tracker.tsx", "Credits Overview", "duplicate inner title");
    mustNotInclude("src/components/create/workspace/workspace-launcher.tsx", "CreditsOverviewHeader", "duplicate header in workspace menu");
  },
  "zip-import-files-ready": () => {
    mustExist("src/lib/projects/project-files-ready.ts");
    mustInclude("src/lib/projects/project-files-ready.ts", "zip_import", "zip import ready");
    mustInclude("src/lib/projects/imported-project-state.ts", "isBuildCompleteForProject", "import build complete");
  },
  "zip-import-code-tab-loads": () => {
    mustExist("src/hooks/use-project-files.ts");
    mustInclude("src/hooks/use-project-files.ts", "/api/projects/", "api file load");
    mustInclude("src/components/builder/app-builder-workspace.tsx", "importedReady", "imported code tab");
  },
  "zip-import-no-generate-first-copy": () => {
    mustInclude("src/components/builder/app-builder-workspace.tsx", "Imported app ready", "imported empty copy");
    mustInclude("src/components/create/workspace/immersive-workspace.tsx", "Imported app ready", "builder import copy");
    mustInclude("src/app/api/projects/[id]/prepare-import/route.ts", "reconcileProjectBuildState", "prepare import route");
  },
  "publish-placeholder-repair": () => {
    mustExist("src/components/publish/placeholder-repair-card.tsx");
    mustExist("src/app/api/projects/[id]/repair-placeholders/route.ts");
    mustInclude("src/components/publish/placeholder-repair-card.tsx", "Auto-fix placeholders", "auto-fix button");
  },
  "publish-validation-user-safe": () => {
    mustInclude("src/lib/publish/publish-readiness.ts", "placeholderFindings", "placeholder findings");
    mustInclude("src/lib/publish/placeholder-findings.ts", "isRawPlaceholderValidatorReason", "raw validator filter");
    mustInclude("src/lib/publish/placeholder-findings.ts", "placeholderBlockerMessage", "user-safe message");
  },
  "builder-tab-cache": () => {
    mustExist("src/lib/cache/fetch-dedupe.ts");
    mustInclude("src/hooks/use-project-files.ts", "fetchDedupe", "project files dedupe");
    mustInclude("src/components/create/workspace/publish-modal.tsx", "fetchDedupe", "publish cache");
  },
  "no-false-empty-states": () => {
    mustInclude("src/hooks/use-project-files.ts", "hasFetchedOnce", "fetch once gate");
    mustInclude("src/components/builder/app-builder-workspace.tsx", "code-tab-skeleton", "code skeleton");
  },
  "project-fetch-dedupe": () => {
    mustInclude("src/lib/cache/fetch-dedupe.ts", "inflight", "inflight dedupe");
    mustInclude("src/hooks/use-project-files.ts", "invalidateProjectFilesCache", "cache invalidation");
  },
};

if (!checkId || !CHECKS[checkId]) {
  console.error(`Usage: node scripts/verify-p0-zip-import.mjs <${Object.keys(CHECKS).join("|")}>`);
  process.exit(1);
}

console.log(`\n=== verify:${checkId} ===\n`);
try {
  CHECKS[checkId]();
  console.log("✓", checkId);
} catch (e) {
  console.error("✗", e instanceof Error ? e.message : e);
  process.exit(1);
}

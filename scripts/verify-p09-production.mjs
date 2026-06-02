#!/usr/bin/env node
/**
 * P0.9 production verification — static contract checks.
 * Usage: node scripts/verify-p09-production.mjs <check-name>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv[2] ?? "";

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function must(src, needle, label, errors) {
  if (!src.includes(needle)) errors.push(label);
}

const suites = {
  "tsx-source-validity": () => {
    const errors = [];
    const mod = read("src/lib/build/tsx-source-validator.ts");
    must(mod, "@babel/parser", "babel parser", errors);
    must(mod, "validateBuildTsxSources", "validator API", errors);
    must(read("src/lib/build/execute-staged-build-job.ts"), "validateBuildTsxSources", "execute uses validator", errors);
    return errors;
  },
  "no-broken-preview-fragments": () => {
    const errors = [];
    const broken = read("src/lib/preview/broken-preview-snapshot.ts");
    must(broken, "detectBrokenPreviewSnapshot", "broken snapshot detector", errors);
    must(read("src/lib/preview/preview-html-diagnostics.ts"), "detectBrokenPreviewSnapshot", "health uses detector", errors);
    const legacy = read("src/lib/preview/static-preview-builder.ts");
    if (legacy.includes("function jsxToStaticHtml") && !legacy.includes("jsx-to-static-html")) {
      errors.push("static-preview-builder should import hardened jsxToStaticHtml");
    }
    return errors;
  },
  "static-preview-renders-ui-not-source": () => {
    const errors = [];
    const jsx = read("src/lib/preview/jsx-to-static-html.ts");
    must(jsx, "extractJsxReturnBody", "balanced return extractor", errors);
    must(jsx, "data-component", "unknown components map to div", errors);
    must(read("src/lib/preview/static-preview-builder.ts"), "jsx-to-static-html", "builder uses hardened transform", errors);
    return errors;
  },
  "file-events-during-persistence-loop": () => {
    const errors = [];
    const persist = read("src/lib/build/persist-generated-files.ts");
    must(persist, "emitFileWriteEvent", "persist emits file events", errors);
    must(persist, "computeFileLineMeta", "line meta from content", errors);
    must(read("src/lib/build/execute-staged-build-job.ts"), "workflowEmit", "execute passes workflow emit", errors);
    return errors;
  },
  "line-deltas-from-persisted-content": () => {
    const errors = [];
    must(read("src/lib/build/file-line-counts.ts"), "computeFileLineMeta", "line meta helper", errors);
    must(read("src/lib/build/persist-generated-files.ts"), "linesAdded: lineMeta", "persist passes deltas", errors);
    return errors;
  },
  "single-owner-diagnostics-launcher": () => {
    const errors = [];
    const fab = read("src/components/create/workspace/admin-diagnostics-fab.tsx");
    const runtime = read("src/components/dev/runtime-diagnostics-drawer.tsx");
    const immersive = read("src/components/create/workspace/immersive-workspace.tsx");
    must(fab, "owner-diagnostics-launcher", "unified launcher testid", errors);
    if (fab.includes("owner-build-diagnostics-launcher")) {
      errors.push("remove legacy owner-build-diagnostics-launcher id");
    }
    must(runtime, "/create", "runtime drawer hidden on create", errors);
    must(runtime, "/builder", "runtime drawer hidden on builder", errors);
    must(immersive, "ownerDiagnostics", "immersive lifts diagnostics", errors);
    const stream = read("src/components/create/workspace/agent-workflow-stream.tsx");
    must(stream, "controlledDiag", "controlled diagnostics path", errors);
    must(stream, "!controlledDiag", "skip duplicate modal when controlled", errors);
    return errors;
  },
  "diagnostics-fetches-persisted-files": () => {
    const errors = [];
    const route = read("src/app/api/projects/[id]/build-jobs/[jobId]/diagnostics/route.ts");
    must(route, "dashboard_page_excerpt", "dashboard excerpt", errors);
    must(route, "preview_diagnostics", "preview diagnostics block", errors);
    must(route, "credit_explanation", "credit explanation", errors);
    must(read("src/components/create/workspace/build-diagnostics-center.tsx"), "onFetchDiagnostics", "copy awaits refetch", errors);
    return errors;
  },
  "icon-visual-mass-quality": () => {
    const errors = [];
    const logo = read("src/lib/projects/app-logo-generation.ts");
    must(logo, "scaleIconVisualMass", "visual mass scaling", errors);
    must(logo, "flattenWhiteCornerArtifacts", "white corner flatten", errors);
    must(logo, "symbolic mark only", "no logotype prompt", errors);
    must(read("src/lib/projects/app-identity-service.ts"), "skipped_paid_icon_due_to_no_action_credits", "depleted credits path", errors);
    return errors;
  },
  "expanded-mvp-generation-quality": () => {
    const errors = [];
    const mod = read("src/lib/build/build-feature-expansion.ts");
    must(mod, "mediation_planner", "mediation archetype features", errors);
    must(mod, "expansionReason", "expansion reason tracking", errors);
    must(mod, "detectDomainArchetype", "domain expansion path", errors);
    must(read("src/lib/build/app-archetype-classifier.ts"), "mediation_planner", "classifier mediation", errors);
    return errors;
  },
  "credit-diagnostics-explain-net-zero": () => {
    const errors = [];
    const route = read("src/app/api/projects/[id]/build-jobs/[jobId]/diagnostics/route.ts");
    must(route, "credit_explanation", "credit explanation string", errors);
    must(route, "credit_events", "credit events query", errors);
    must(read("src/lib/build/build-diagnostics.ts"), "credit_explanation", "copy prompt includes explanation", errors);
    return errors;
  },
};

if (!suites[check]) {
  console.error(`Unknown check: ${check}`);
  console.error("Available:", Object.keys(suites).join(", "));
  process.exit(1);
}

const errors = suites[check]();
console.log(`\n=== verify:${check} ===\n`);
if (errors.length) {
  errors.forEach((e) => console.error("✗", e));
  process.exit(1);
}
console.log("✓ OK");

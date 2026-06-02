#!/usr/bin/env node
/**
 * P0.8 production verification — static contract checks.
 * Usage: node scripts/verify-p08-production.mjs <check-name>
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
  "premium-intro-ui": () => {
    const errors = [];
    const intro = read("src/components/session/vodex-session-intro.tsx");
    const css = read("src/app/globals.css");
    must(intro, "vodex-premium-intro", "premium intro shell", errors);
    must(intro, "vodex-premium-intro__letter", "letter reveal", errors);
    must(intro, "2800", "2.8s intro duration", errors);
    must(css, "@keyframes vodex-intro-icon-in", "icon scale animation", errors);
    must(css, "prefers-reduced-motion", "reduced motion", errors);
    return errors;
  },
  "build-feature-expansion": () => {
    const errors = [];
    const mod = read("src/lib/build/build-feature-expansion.ts");
    const pipe = read("src/lib/build/build-pipeline.ts");
    must(mod, "expandBuildPromptIfShallow", "expansion API", errors);
    must(mod, "restaurant_inventory", "inventory archetype expansion", errors);
    must(pipe, "expandBuildPromptIfShallow", "pipeline uses expansion", errors);
    must(pipe, "feature_expansion_count", "persists expansion meta", errors);
    return errors;
  },
  "no-shallow-generated-ui": () => {
    const errors = [];
    must(read("src/lib/build/generated-ui-quality-checker.ts"), "shallow_primary_route", "shallow UI check", errors);
    must(read("src/lib/build/post-build-contract.ts"), "enforcePostBuildContractWithRepair", "contract repair", errors);
    must(read("src/lib/build/build-feature-expansion.ts"), "Do not ship a welcome-only", "anti-shallow brief", errors);
    return errors;
  },
  "no-false-success-copy": () => {
    const errors = [];
    must(read("src/lib/build/execute-staged-build-job.ts"), "Draft saved — preview needs repair", "preview repair copy", errors);
    must(read("src/lib/build/build-pipeline.ts"), "preview needs repair", "pipeline draft copy", errors);
    must(read("src/lib/build/workflow-status-guards.ts"), "previewReady", "preview guard", errors);
    return errors;
  },
  "diagnostics-complete-fields": () => {
    const errors = [];
    const route = read("src/app/api/projects/[id]/build-jobs/[jobId]/diagnostics/route.ts");
    must(route, "ai_usage_rows", "AI usage rows", errors);
    must(route, "field_missing_notes", "missing field notes", errors);
    must(route, "from(\"messages\")", "conversation prompt linkage", errors);
    must(route, "thin_or_missing_files", "thin file report", errors);
    must(read("src/lib/build/build-diagnostics.ts"), "credit_accounting", "credit accounting block", errors);
    return errors;
  },
  "diagnostic-copy-buttons": () => {
    const errors = [];
    must(read("src/components/create/workspace/build-diagnostics-center.tsx"), "Copied fix prompt —", "fix prompt toast", errors);
    must(read("src/lib/clipboard/copy-text.ts"), "copyTextToClipboard", "clipboard helper", errors);
    return errors;
  },
  "owner-diagnostics-center-left-modal": () => {
    const errors = [];
    const fab = read("src/components/create/workspace/admin-diagnostics-fab.tsx");
    must(fab, "owner-diagnostics-launcher", "center-left launcher", errors);
    must(fab, "useDraggablePosition", "draggable launcher", errors);
    if (fab.includes("bottom-4 right-4")) {
      errors.push("admin diagnostics must not use bottom-right FAB");
    }
    must(read("src/components/create/workspace/build-diagnostics-center.tsx"), "items-center justify-center", "centered modal", errors);
    return errors;
  },
  "icon-generation-billing-and-quality": () => {
    const errors = [];
    must(read("src/lib/projects/app-logo-generation.ts"), "NO text", "no-text icon prompt", errors);
    must(read("src/lib/projects/app-identity-service.ts"), "skipped_paid_icon_due_to_no_action_credits", "depleted credits log", errors);
    must(read("src/lib/projects/app-logo-generation.ts"), "normalizeIconBuffer", "post-process", errors);
    return errors;
  },
  "credit-accounting-build-icon": () => {
    const errors = [];
    must(read("src/lib/billing/build-credit-audit-log.ts"), "credit_reserved", "reserve trail", errors);
    must(read("src/lib/billing/credit-reservations.ts"), "logBuildCreditReconciliation", "reconcile log hook", errors);
    must(read("src/app/api/projects/[id]/build-jobs/[jobId]/diagnostics/route.ts"), "icon_credit_depleted", "icon credit diagnostics", errors);
    return errors;
  },
  "files-persist-before-success": () => {
    const errors = [];
    must(read("src/lib/build/assert-build-files-persisted.ts"), "files_persistence_failed", "persist gate", errors);
    must(read("src/lib/build/execute-staged-build-job.ts"), "fileGate.ok", "success gated on persist", errors);
    must(read("src/lib/build/execute-staged-build-job.ts"), "finalizeBuildSuccess", "finalize after persist", errors);
    return errors;
  },
  "preview-repair-before-final-failure": () => {
    const errors = [];
    must(read("src/lib/build/execute-staged-build-job.ts"), "runDeterministicPreviewRepair", "preview repair", errors);
    must(read("src/lib/build/execute-staged-build-job.ts"), "isPreviewRepairEligible", "repair eligibility", errors);
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

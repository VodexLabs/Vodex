#!/usr/bin/env node
/**
 * P1.3.27 — Worker TS zip-credits, absolute preview URLs, credit capture, import progress lifecycle.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function must(src, needle, label, errors) {
  if (!src.includes(needle)) errors.push(label);
}

function mustNot(src, needle, label, errors) {
  if (src.includes(needle)) errors.push(label);
}

const suites = {
  "worker-zip-credits-discriminated-union": () => {
    const errors = [];
    const src = read("worker/preview-worker/src/zip-credits.ts");
    must(src, "type ZipCreditResult", "ZipCreditResult union", errors);
    must(src, "success: true", "success branch", errors);
    must(src, "success: false", "failure branch", errors);
    must(src, "parseZipCreditRpc", "rpc parser", errors);
    mustNot(src, "row?.error", "no unsafe row.error access", errors);
    return errors;
  },
  "preview-html-url-absolute": () => {
    const errors = [];
    const url = read("src/lib/preview/internal-preview-url.ts");
    must(url, "normalizeStoredPreviewUrl", "db url normalization", errors);
    must(url, "console.warn", "bad url diagnostic", errors);
    must(read("src/app/api/projects/[id]/preview/import-status/route.ts"), "normalizeStoredPreviewUrl", "import-status normalizes", errors);
    must(read("src/components/create/workspace/preview-panel.tsx"), "correcting relative preview iframe", "panel runtime guard log", errors);
    must(read("src/components/create/workspace/creation-workspace.tsx"), "tryNormalizeInternalPreviewUrl", "creation workspace normalizes", errors);
    return errors;
  },
  "zip-preview-no-relative-api-route": () => {
    const errors = [];
    const panel = read("src/components/create/workspace/preview-panel.tsx");
    must(panel, 'startsWith("api/projects/")', "panel detects relative path", errors);
    must(panel, "refused relative api/projects iframe src", "panel refuses bad src", errors);
    must(read("src/lib/preview/internal-preview-url.ts"), 'startsWith("api/projects/")', "central normalizer", errors);
    return errors;
  },
  "zip-preview-credit-capture-on-success": () => {
    const errors = [];
    must(read("src/lib/action-credits/charge-action-credit.ts"), "dynamicFloor: input.dynamicFloor ?? credits", "affordability uses dynamic floor", errors);
    must(read("src/lib/imports/zip-preview-credit-reconcile.ts"), "holdAfter?.status === \"charged\"", "idempotent capture reconcile", errors);
    must(read("src/components/apps/zip-import-wizard.tsx"), "refreshCredits", "wizard refreshes balance after capture", errors);
    must(read("src/app/api/projects/[id]/preview/import-status/route.ts"), "captured_action_credits", "import-status billing fields", errors);
    return errors;
  },
  "zip-import-progress-lifecycle": () => {
    const errors = [];
    const wiz = read("src/components/apps/zip-import-wizard.tsx");
    must(wiz, "pollImportPreviewStatus", "polls until terminal", errors);
    must(wiz, "preview/import-status", "uses import-status API", errors);
    must(wiz, "Preview ready", "shows preview ready stage", errors);
    must(wiz, "Worker installing dependencies", "staged worker install", errors);
    const confirmBody = wiz.split("async function confirmImport()")[1]?.split("function handleClose")[0] ?? "";
    mustNot(confirmBody, 'setStep("done")', "confirmImport does not early-redirect", errors);
    mustNot(confirmBody, "router.push", "confirmImport waits before navigation", errors);
    must(wiz, 'setStep("results")', "shows results after poll completes", errors);
    return errors;
  },
  "preview-panel-iframe-src-test": () => {
    const errors = [];
    const panel = read("src/components/create/workspace/preview-panel.tsx");
    must(panel, '!src.includes("/api/projects/")', "iframe src guard test", errors);
    return errors;
  },
};

const only = process.argv[2];
const names = only && only !== "all" ? [only] : Object.keys(suites);
let failed = 0;
for (const name of names) {
  const errors = suites[name]?.();
  if (!errors) {
    console.error(`Unknown suite: ${name}`);
    failed += 1;
    continue;
  }
  if (errors.length) {
    console.error(`FAIL verify:${name}`);
    for (const e of errors) console.error(`  - ${e}`);
    failed += 1;
  } else {
    console.log(`OK verify:${name}`);
  }
}
process.exit(failed ? 1 : 0);

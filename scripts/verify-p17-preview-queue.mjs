#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mustInclude, finish } from "./lib/verify-static.mjs";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

const checks = {
  "preview-route-renders-persisted-files": () => {
    mustInclude(root, "src/lib/preview/static-preview-builder.ts", ["wrapPreviewDocument", "buildStaticPreviewHtml"], errors);
    mustInclude(root, "src/lib/preview/restaurant-static-preview.ts", ["isRestaurantInventoryPreview"], errors);
    const r = spawnSync("npx", ["tsx", path.join(root, "scripts/lib/verify-p06-preview-run.ts")], {
      cwd: root,
      shell: true,
      encoding: "utf8",
    });
    if (r.status !== 0) errors.push(`preview html run failed: ${(r.stderr || r.stdout || "").trim()}`);
  },
  "preview-ready-marker": () => {
    mustInclude(root, "src/lib/preview/static-preview-builder.ts", ['data-testid="generated-app-preview-root"', 'data-preview-ready="true"'], errors);
  },
  "restaurant-preview-markers": () => {
    mustInclude(root, "src/lib/preview/restaurant-static-preview.ts", ["restaurant-dashboard", "inventory-table", "low-stock-alerts"], errors);
    mustInclude(root, "src/lib/build/restaurant-inventory-scaffold.ts", ['data-testid="restaurant-dashboard"'], errors);
  },
  "preview-e2e-diagnostics": () => {
    mustInclude(root, "tests/e2e/helpers/preview-render-check.ts", ["preview-render-failure.json", "PreviewRenderRootCause"], errors);
  },
  "preview-snapshot-has-16-files": () => {
    mustInclude(root, "src/lib/build/restaurant-inventory-scaffold.ts", ['path: "app/page.tsx"', 'path: "app/inventory/page.tsx"'], errors);
    const raw = fs.readFileSync(
      path.join(root, "src/lib/build/restaurant-inventory-scaffold.ts"),
      "utf8",
    );
    const count = (raw.match(/path:\s*"/g) ?? []).length;
    if (count < 16) errors.push(`restaurant scaffold path entries ${count} < 16`);
  },
  "preview-main-route-resolution": () => {
    mustInclude(root, "src/lib/preview/preview-sandbox.ts", ["app\\/dashboard", "pickPreviewEntry"], errors);
    mustInclude(root, "src/lib/preview/static-preview-builder.ts", ["isRestaurantInventoryPreview", "wrapPreviewDocument"], errors);
  },
  "preview-runtime-error-diagnostics": () => {
    mustInclude(root, "tests/e2e/helpers/preview-render-check.ts", ["generated_app_runtime_error", "iframe_body_html_excerpt"], errors);
  },
  "queue-accepts-eight": () => {
    mustInclude(root, "src/lib/create/queue-constants.ts", ["PROMPT_QUEUE_MAX = 8"], errors);
    mustInclude(root, "src/components/create/workspace/immersive-workspace.tsx", ["enqueuePrompt", "queueOnly: true"], errors);
  },
  "queue-blocks-ninth": () => {
    mustInclude(root, "src/lib/create/composer-text.ts", ['return "queue_full"', "queueCount >= input.queueMax"], errors);
  },
  "queue-blocks-empty": () => {
    mustInclude(root, "src/lib/create/composer-text.ts", ['return "empty"'], errors);
  },
  "queue-blocks-duplicates": () => {
    mustInclude(root, "src/components/create/workspace/immersive-workspace.tsx", ["lastEnqueueFingerprintRef"], errors);
  },
  "queue-same-project": () => {
    mustInclude(root, "src/components/create/workspace/composer-prompt-queue.tsx", ["composer-prompt-queue"], errors);
  },
  "restaurant-e2e-no-unclassified-console-errors": () => {
    mustInclude(root, "tests/e2e/helpers/console-error-classifier.ts", ["ALLOWED_CONSOLE_PATTERNS", "unclassified"], errors);
  },
  "restaurant-core-path-still-green": () => {
    mustInclude(root, "tests/e2e/restaurant-inventory-workflow.spec.ts", ["waitForBuildJobStarted", "fetchProjectFiles"], errors);
    mustInclude(root, "src/components/create/workspace/immersive-workspace.tsx", ["enqueueAsyncBuild"], errors);
  },
};

const target = process.argv[2];
if (!target || !checks[target]) {
  console.error(`Usage: node scripts/verify-p17-preview-queue.mjs <${Object.keys(checks).join("|")}>`);
  process.exit(1);
}
checks[target]();
finish(`verify:${target}`, errors);

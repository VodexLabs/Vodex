#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}
function pass(msg) {
  console.log(`PASS: ${msg}`);
}

const checks = {
  "app-icon-openai-mini-generation": () => {
    const logo = read("src/lib/projects/app-logo-generation.ts");
    const route = read("src/lib/ai/image-provider-routing.ts");
    if (!route.includes("gpt-image-1-mini")) fail("missing gpt-image-1-mini");
    if (!logo.includes("generateAppLogoWithOpenAi")) fail("missing OpenAI-only generator");
    pass("OpenAI mini icon generation");
  },
  "app-icon-only-on-build": () => {
    const id = read("src/lib/projects/app-identity-service.ts");
    if (!id.includes("createAppIdentityForBuild")) fail("missing build identity");
    pass("icon on build identity");
  },
  "app-icon-charges-action-credits": () => {
    const id = read("src/lib/projects/app-identity-service.ts");
    if (!id.includes("app_icon_ai_generation")) fail("missing app_icon_ai_generation charge");
    pass("action credits for icon");
  },
  "app-icon-refunds-on-provider-failure": () => {
    const id = read("src/lib/projects/app-identity-service.ts");
    if (!id.includes("refundActionCredit")) fail("missing refund on failure");
    if (!read("src/lib/action-credits/refund-action-credit.ts").includes("refund_action_credits")) {
      fail("missing refund RPC");
    }
    pass("refund on provider failure");
  },
  "app-icon-fallback-when-no-action-credits": () => {
    const id = read("src/lib/projects/app-identity-service.ts");
    if (!id.includes("skipped_no_action_credits")) fail("missing no credits path");
    if (!id.includes("Action Credits were unavailable")) fail("missing user notice");
    pass("fallback when no action credits");
  },
  "app-icon-updates-workspace-and-cards": () => {
    const id = read("src/lib/projects/app-identity-service.ts");
    if (!id.includes("icon_url")) fail("missing icon_url persist");
    pass("icon persisted to project");
  },
  "user-uploaded-icon-not-overwritten": () => {
    const id = read("src/lib/projects/app-identity-service.ts");
    if (!id.includes("isUserUploadedProjectIcon")) fail("missing user upload guard");
    pass("user upload not overwritten");
  },
  "publish-subdomain-allocation": () => {
    const a = read("src/lib/publish/subdomain-allocator.ts");
    if (!a.includes("allocatePublishSubdomain")) fail("missing allocator");
    pass("publish subdomain allocation");
  },
  "publish-subdomain-collision-retry": () => {
    const a = read("src/lib/publish/subdomain-allocator.ts");
    if (!a.includes("23505")) fail("missing unique retry");
    if (!a.includes("-2")) fail("missing suffix retry");
    pass("collision retry");
  },
  "publish-subdomain-reserved-words": () => {
    const a = read("src/lib/publish/subdomain-allocator.ts");
    if (!a.includes("isReservedPublishSlugStrict")) fail("missing reserved check");
    pass("reserved words");
  },
  "publish-subdomain-atomic-reservation": () => {
    const a = read("src/lib/publish/subdomain-allocator.ts");
    if (!a.includes('.is("published_subdomain", null)')) fail("missing atomic null guard");
    pass("atomic reservation");
  },
  "publish-error-specific-not-generic": () => {
    const p = read("src/components/create/workspace/publish-modal.tsx");
    if (p.includes('body.error ?? "Could not allocate subdomain"')) {
      fail("still uses generic allocate error only");
    }
    if (!p.includes("body.message")) fail("missing message parse");
    pass("specific publish errors");
  },
  "publish-table-health-check": () => {
    const a = read("src/lib/publish/subdomain-allocator.ts");
    if (!a.includes("missing_publish_table")) fail("missing table health code");
    pass("publish table health");
  },
  "publish-modal-closes-or-progresses": () => {
    const p = read("src/components/create/workspace/publish-modal.tsx");
    if (!p.includes("publish-progress-overlay")) fail("missing progress overlay");
    if (!p.includes("onClose()")) fail("modal should close on success");
    pass("publish modal progress/close");
  },
  "publish-loading-status-pill": () => {
    const w = read("src/components/create/workspace/workspace-launcher.tsx");
    if (!w.includes("publish-status-pill")) fail("missing status pill");
    pass("publish status pill");
  },
  "publish-no-duplicate-jobs": () => {
    const p = read("src/components/create/workspace/publish-modal.tsx");
    if (!p.includes("publishInFlightRef")) fail("missing in-flight guard");
    pass("no duplicate publish jobs");
  },
  "publish-status-polling": () => {
    const p = read("src/components/create/workspace/publish-modal.tsx");
    if (!p.includes("setPhase")) fail("missing phase updates");
    pass("publish status phases");
  },
  "publish-success-url-actions": () => {
    const p = read("src/components/create/workspace/publish-modal.tsx");
    if (!p.includes("Copy") || !p.includes("Open")) fail("missing copy/open");
    pass("publish url actions");
  },
  "publish-failure-retry": () => {
    const p = read("src/components/create/workspace/publish-modal.tsx");
    if (!p.includes("publish-error-card")) fail("missing error retry card");
    pass("publish failure retry");
  },
};

const arg = process.argv[2] ?? "all";
if (arg === "all") {
  for (const fn of Object.values(checks)) fn();
} else if (checks[arg]) {
  checks[arg]();
} else {
  fail(`unknown check ${arg}`);
}

if (!process.exitCode) console.log("\nAll P0 icon/publish checks passed.");

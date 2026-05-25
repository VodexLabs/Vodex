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
  "builder-no-credit-tracker-in-chat": () => {
    mustNotInclude("src/components/create/workspace/immersive-workspace.tsx", "CreditsTracker", "credits tracker in builder");
    mustNotInclude("src/components/create/workspace/immersive-workspace.tsx", "CreditsBalanceChip", "balance chip in composer");
    mustNotInclude("src/components/create/workspace/workspace-launcher.tsx", "CreditsBalanceChip", "credits chip in toolbar");
  },
  "credits-compact-popover": () => {
    mustInclude("src/components/create/workspace/workspace-launcher.tsx", 'variant="popover"', "compact workspace menu credits");
  },
  "plan-first-chat-only": () => {
    mustInclude("src/components/create/workspace/immersive-workspace.tsx", "planFirstOnly", "plan-first chat flag");
    mustInclude("src/app/api/chat/route.ts", "planFirstOnly", "server plan-first gate");
    mustInclude("src/components/create/workspace/immersive-workspace.tsx", "planFooter", "plan in chat bubble");
    mustNotInclude("src/components/create/workspace/immersive-workspace.tsx", "loadBlueprint(text);\n      setSubmitStatusLabel", "silent blueprint without chat");
  },
  "plan-first-question-no-project": () => {
    mustInclude("src/lib/intent/create-intent-classifier.ts", "IDEA_REQUEST", "idea question gate");
    mustInclude("src/components/create/create-workspace-entry.tsx", "setDiscussOnly", "no project for questions");
  },
  "no-intent-review-cards": () => {
    mustNotInclude("src/components/create/workspace/immersive-workspace.tsx", "CreateIntentStep", "intent review card");
    mustNotInclude("src/components/create/workspace/immersive-workspace.tsx", "plan-ready-card", "plan ready card");
    mustNotInclude("src/components/create/workspace/immersive-workspace.tsx", "Type a message before sending", "big empty card copy");
  },
  "send-dedupe-cooldown": () => {
    mustInclude("src/components/create/workspace/immersive-workspace.tsx", "SEND_COOLDOWN_MS", "send cooldown");
    mustInclude("src/components/create/workspace/immersive-workspace.tsx", "sendCooldownUntil", "cooldown state");
    mustInclude("src/components/create/workspace/immersive-workspace.tsx", "idempotencyKey", "client idempotency");
  },
  "no-duplicate-chat-send": () => {
    mustInclude("src/app/api/chat/route.ts", "duplicate_idempotency", "server duplicate reject");
    mustInclude("src/app/api/chat/route.ts", "hasUserMessageForOperation", "duplicate message check");
  },
  "advanced-dev-single-location": () => {
    mustNotInclude("src/components/create/workspace/app-dashboard-panel.tsx", "advanced-developer-toggle", "global advanced toggle");
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "developer-diagnostics-toggle", "settings diagnostics");
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", 'case "settings"', "diagnostics under settings");
  },
  "no-preview-in-dev-diagnostics": () => {
    mustNotInclude("src/components/create/workspace/app-dashboard-panel.tsx", "PreviewPanel", "preview in dashboard");
    mustNotInclude("src/components/create/workspace/app-dashboard-panel.tsx", 'label: "Preview"', "preview section label");
  },
  "settings-inline-edit": () => {
    mustExist("src/components/create/workspace/app-settings-inline-form.tsx");
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "AppSettingsInlineForm", "inline settings form");
    mustNotInclude("src/components/create/workspace/app-dashboard-panel.tsx", "Edit app details", "redirect edit link");
  },
  "dashboard-no-framework-labels": () => {
    mustInclude("src/components/os-home/your-apps-section.tsx", 'mode: "user"', "user-safe badges on home");
  },
  "no-false-empty-states": () => {
    mustInclude("src/hooks/use-project-files.ts", "hasFetchedOnce", "files fetch gate");
  },
};

if (!checkId || !CHECKS[checkId]) {
  console.error(`Usage: node scripts/verify-p04.mjs <${Object.keys(CHECKS).join("|")}>`);
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

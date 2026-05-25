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
  "plan-first-no-modal": () => {
    mustExist("src/components/create/workspace/app-plan-inline-card.tsx");
    mustInclude("src/components/create/workspace/immersive-workspace.tsx", "AppPlanInlineCard", "inline plan card");
    mustNotInclude("src/components/create/workspace/immersive-workspace.tsx", "BlueprintConfirmationModal", "plan modal");
  },
  "plan-first-question-no-project": () => {
    mustInclude("src/lib/intent/create-intent-classifier.ts", "IDEA_REQUEST", "idea request gate");
    mustInclude("src/components/create/create-workspace-entry.tsx", "classify-intent", "classify before draft");
    mustInclude("src/components/create/create-workspace-entry.tsx", "setDiscussOnly", "discuss-only path");
  },
  "create-question-no-build": () => {
    mustInclude("src/components/create/workspace/immersive-workspace.tsx", 'submitMode = "discuss"', "discuss on question");
    mustInclude("src/lib/intent/create-intent-classifier.ts", "shouldCreateProject: false", "no project for questions");
  },
  "smart-app-naming": () => {
    mustExist("src/lib/projects/derive-app-name.ts");
    mustInclude("src/lib/projects/create-project-from-prompt.ts", "deriveAppNameFromPrompt", "smart naming");
    mustNotInclude("src/lib/projects/create-project-from-prompt.ts", "prompt.slice(0, 80)", "raw prompt name");
  },
  "no-user-facing-credit-estimates": () => {
    mustNotInclude("src/components/build/app-blueprint-panel.tsx", "Up to", "blueprint reserve copy");
    mustNotInclude("src/components/create/workspace/immersive-workspace.tsx", "CreateCreditEstimate", "composer estimate");
    mustInclude("src/components/chat/message-cost-header.tsx", "return null", "hidden message cost");
  },
  "no-technical-scope-copy": () => {
    mustNotInclude("src/lib/build/blueprint-archetypes.ts", "Native iOS/Android binaries", "native binary copy");
    mustInclude("src/lib/build/blueprint-archetypes.ts", "main app experience", "friendly scope");
  },
  "auto-app-icon-flow": () => {
    mustInclude("src/lib/projects/create-project-from-prompt.ts", "appIconSvgDataUrl", "icon on create");
    mustExist("src/lib/creation/app-icon-svg.ts");
  },
  "credits-compact-everywhere": () => {
    mustExist("src/components/credits/credits-balance-chip.tsx");
    mustInclude("src/components/create/workspace/workspace-launcher.tsx", 'variant="popover"', "compact workspace credits");
    mustInclude("src/components/credits/credits-tracker.tsx", 'density="popover"', "compact uses popover density");
  },
  "no-large-credits-in-input": () => {
    mustNotInclude("src/components/create/workspace/immersive-workspace.tsx", 'variant="compact"', "large credits in composer");
    mustInclude("src/components/create/workspace/immersive-workspace.tsx", "CreditsBalanceChip", "balance chip in composer header");
  },
  "dashboard-product-sections": () => {
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "Insights", "insights section");
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "Growth", "growth section");
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "Activity", "activity section");
    mustNotInclude("src/components/create/workspace/app-dashboard-panel.tsx", 'label: "Agents"', "agents removed");
  },
  "no-preview-in-dashboard": () => {
    mustNotInclude("src/components/create/workspace/app-dashboard-panel.tsx", 'label: "Preview"', "preview nav in dashboard");
    mustNotInclude("src/components/create/workspace/app-dashboard-panel.tsx", 'id: "preview"', "preview section id");
  },
  "app-menu-routes": () => {
    mustInclude("src/components/create/workspace/workspace-launcher.tsx", 'tab: "code"', "code tab route");
    mustInclude("src/components/create/workspace/workspace-launcher.tsx", 'tab: "preview"', "preview tab route");
    mustInclude("src/components/create/workspace/workspace-launcher.tsx", 'section: "overview"', "dashboard overview");
  },
  "zip-import-code-visible": () => {
    mustInclude("src/components/builder/app-builder-workspace.tsx", "Imported app ready", "import code state");
    mustExist("src/hooks/use-project-files.ts");
  },
  "no-framework-labels-user-ui": () => {
    mustInclude("src/lib/projects/user-safe-project-badges.ts", 'mode === "user"', "hide framework badges");
    mustInclude("src/components/os-home/your-apps-section.tsx", 'mode: "user"', "user mode badges on home");
  },
  "home-app-card-clean": () => {
    mustInclude("src/components/os-home/your-apps-section.tsx", "ProjectBanner", "banner on cards");
    mustInclude("src/components/os-home/your-apps-section.tsx", "ProjectIcon", "icon on cards");
  },
  "create-page-no-fast-refresh-loop": () => {
    mustNotInclude("src/components/create/create-workspace-entry.tsx", "sessionStorage.setItem", "storage during render");
    mustInclude("src/components/create/create-workspace-entry.tsx", "React.useEffect", "bootstrap in effect");
  },
  "dev-clean-script": () => {
    mustInclude("package.json", "dev:clean", "dev clean script");
    mustInclude("package.json", "clean:next", "clean next script");
    mustExist("scripts/doctor-next-manifest.mjs");
  },
  "no-false-empty-states": () => {
    mustInclude("src/hooks/use-project-files.ts", "hasFetchedOnce", "files fetch gate");
    mustInclude("src/components/os-home/your-apps-section.tsx", "hasApps", "apps loading gate");
  },
  "credits-no-spam": () => {
    mustInclude("src/lib/stores/credits-store.ts", "inFlightRequest", "credits inflight dedupe");
  },
};

if (!checkId || !CHECKS[checkId]) {
  console.error(`Usage: node scripts/verify-p03.mjs <${Object.keys(CHECKS).join("|")}>`);
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

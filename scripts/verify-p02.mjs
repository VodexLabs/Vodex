#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkId = process.argv[2];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) throw new Error(`missing ${rel}`);
}

function mustInclude(rel, needle, label) {
  const src = read(rel);
  if (!src.includes(needle)) throw new Error(`${rel} missing ${label}`);
}

function mustNotInclude(rel, needle, label) {
  const src = read(rel);
  if (src.includes(needle)) throw new Error(`${rel} should not contain ${label}`);
}

const CHECKS = {
  "chat-conversation-switching": () => {
    mustExist("src/lib/stores/chat-conversation-store.ts");
    mustInclude("src/components/chat/chat-view.tsx", "switchConversation", "switchConversation");
    mustInclude("src/components/chat/chat-view.tsx", "setActiveConvId", "optimistic active id");
    mustInclude("src/components/chat/chat-view.tsx", "getCachedMessages", "cache hydrate on switch");
  },
  "chat-stale-response-guard": () => {
    mustInclude("src/components/chat/chat-view.tsx", "activeConvRef.current !== targetId", "stale response guard");
    mustInclude("src/lib/stores/chat-conversation-store.ts", "beginConversationLoad", "abort controller");
  },
  "chat-message-cache": () => {
    mustInclude("src/lib/stores/chat-conversation-store.ts", "messagesByConversationId", "message cache map");
    mustInclude("src/components/chat/chat-view.tsx", "setCachedMessages", "cache write");
  },
  "chat-instant-send-ui": () => {
    mustInclude("src/components/chat/chat-view.tsx", "opt-user-", "optimistic user bubble");
    mustInclude("src/components/chat/chat-view.tsx", "setInput(\"\")", "clear input on send");
  },
  "chat-workflow-status-ui": () => {
    mustInclude("src/components/chat/chat-view.tsx", "Understanding your request", "workflow label");
    mustInclude("src/components/chat/chat-view.tsx", "Writing response", "streaming label");
  },
  "no-duplicate-chat-loading": () => {
    mustInclude("src/components/chat/chat-view.tsx", "chat-message-skeleton", "skeleton not full-page loader");
    mustNotInclude("src/components/chat/chat-view.tsx", "Loader2 className=\"size-5 animate-spin\"", "giant spinner in messages");
  },
  "chat-send-does-not-block-ui": () => {
    mustInclude("src/components/chat/chat-view.tsx", "submitInFlightRef", "non-blocking send guard");
  },
  "plan-first-disables-direct-build": () => {
    mustInclude("src/components/create/workspace/immersive-workspace.tsx", "buildStrategyRef.current !== \"build_now\"", "plan blocks direct build");
    mustInclude("src/components/create/workspace/immersive-workspace.tsx", "loadBlueprint", "blueprint before build");
  },
  "plan-first-creates-blueprint": () => {
    mustInclude("src/components/create/workspace/immersive-workspace.tsx", "/api/build/blueprint", "blueprint API");
    mustInclude("src/components/build/blueprint-confirmation-modal.tsx", "Blueprint", "blueprint modal");
  },
  "plan-ready-build-from-plan": () => {
    mustInclude("src/components/create/workspace/immersive-workspace.tsx", "plan-ready-card", "plan ready card");
    mustInclude("src/components/create/workspace/immersive-workspace.tsx", "confirmBlueprintBuild", "build from plan");
  },
  "no-duplicate-build-plan-mode": () => {
    mustNotInclude("src/components/os-home/os-home.tsx", "PlanFirstControl", "no segmented control on home");
    mustNotInclude("src/components/create/workspace/immersive-workspace.tsx", "PlanFirstControl", "no segmented control in builder composer");
  },
  "home-plan-toggle-behavior": () => {
    mustInclude("src/components/os-home/os-home.tsx", "PlanFirstToggle", "home plan toggle");
    mustInclude("src/components/os-home/os-home.tsx", "Create plan", "create plan label");
    mustInclude("src/components/os-home/os-home.tsx", "home-build-submit", "build submit");
  },
  "dashboard-section-publish-locks": () => {
    mustInclude("src/lib/dashboard/section-access.ts", "locked_publish_required", "publish lock access");
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "dashboard-locked-state", "locked UI");
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "Publish your app first", "publish copy");
  },
  "dashboard-overview-accessible-before-publish": () => {
    mustInclude("src/lib/dashboard/section-access.ts", 'section === "overview"', "overview always unlocked");
  },
  "dashboard-sections-unlock-after-publish": () => {
    mustInclude("src/lib/dashboard/section-access.ts", "isProjectPublished", "published check");
  },
  "dashboard-plan-gates": () => {
    mustInclude("src/lib/dashboard/section-access.ts", "locked_plan_required", "plan gate");
    mustInclude("src/lib/dashboard/section-access.ts", "isPaidPlan", "paid plan check");
  },
  "dashboard-overview-user-safe": () => {
    mustNotInclude("src/components/create/workspace/app-dashboard-panel.tsx", "Vite", "no vite in dashboard");
    mustNotInclude("src/components/create/workspace/app-dashboard-panel.tsx", "Supabase", "no supabase in dashboard");
  },
  "no-routes-buildscript-envvars-dashboard": () => {
    const main = read("src/components/create/workspace/app-dashboard-panel.tsx");
    const overviewSlice = main.split("overviewContent")[1]?.split("renderSectionBody")[0] ?? "";
    if (/build script|env var|framework|file count|source file/i.test(overviewSlice)) {
      throw new Error("overview contains technical noise");
    }
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "Advanced developer mode", "tech in advanced only");
  },
  "dashboard-action-credit-user-copy": () => {
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "Action Credits", "action credits label");
    mustNotInclude("src/components/create/workspace/app-dashboard-panel.tsx", "provider cost", "no provider cost");
  },
  "dashboard-section-pages-exist": () => {
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "dashboard-internal-nav", "internal nav");
    for (const s of ["users", "analytics", "marketing", "agents", "automations", "api"]) {
      mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", `"${s}"`, `section ${s}`);
    }
  },
  "dashboard-sections-user-friendly": () => {
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "App data", "friendly data label");
    mustNotInclude("src/components/create/workspace/app-dashboard-panel.tsx", "database schema", "no schema in main");
  },
  "no-secret-values-dashboard": () => {
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "Saved securely", "secrets masked");
    mustNotInclude("src/components/create/workspace/app-dashboard-panel.tsx", "••••••••", "no raw secret mask pattern");
  },
  "dashboard-advanced-only-technical": () => {
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "tech_routes", "routes in advanced");
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "advancedOpen", "collapsed advanced");
  },
  "preview-top-level-only": () => {
    mustInclude("src/components/create/workspace/immersive-workspace.tsx", '"preview"', "preview top tab");
  },
  "no-preview-in-dashboard-tools": () => {
    mustNotInclude("src/components/create/workspace/app-dashboard-panel.tsx", "onOpenPreview", "no preview opener in dashboard");
    mustNotInclude("src/components/create/workspace/app-dashboard-panel.tsx", "Open preview", "no preview button");
    mustNotInclude("src/components/apps/app-project-dashboard.tsx", "Preview", "no preview nav item");
  },
  "no-preview-in-code-tab": () => {
    mustNotInclude("src/components/builder/app-builder-workspace.tsx", "PreviewWorkspace", "no preview in code tab");
  },
  "advanced-developer-mode-collapsed": () => {
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "advancedOpen, setAdvancedOpen] = React.useState(false)", "advanced collapsed default");
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "advanced-developer-toggle", "advanced toggle");
  },
  "normal-dashboard-not-dependent-on-advanced": () => {
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "dashboard-internal-nav", "first-class nav");
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "MAIN_NAV", "main sections");
  },
  "projects-no-false-empty-state": () => {
    mustInclude("src/components/apps/projects-view.tsx", "hasFetchedOnce", "fetch gate");
    mustInclude("src/components/apps/projects-view.tsx", "showEmpty", "empty only after fetch");
  },
  "projects-skeleton-first-load": () => {
    mustInclude("src/components/apps/projects-view.tsx", "showGridSkeleton", "skeleton gate");
    mustInclude("src/components/apps/projects-view.tsx", "ProjectCardSkeleton", "skeleton cards");
  },
  "projects-cache-before-refresh": () => {
    mustInclude("src/components/apps/projects-view.tsx", "PROJECTS_CACHE_KEY", "session cache");
    mustInclude("src/components/apps/projects-view.tsx", "sessionStorage", "cache storage");
  },
  "projects-no-fetch-loop": () => {
    mustInclude("src/components/apps/projects-view.tsx", "lastLoadRef", "fetch throttle");
  },
  "navigation-responsive": () => {
    mustInclude("src/components/chat/chat-view.tsx", "scroll: false", "non-blocking url replace");
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "setSection", "instant section switch");
  },
  "no-blocking-route-refresh": () => {
    mustInclude("src/components/chat/chat-view.tsx", "router.replace", "client url update");
  },
  "dashboard-nav-clicks": () => {
    mustInclude("src/components/create/workspace/app-dashboard-panel.tsx", "data-dashboard-section", "nav markers");
  },
};

if (!checkId || !CHECKS[checkId]) {
  console.error(`Usage: node scripts/verify-p02.mjs <${Object.keys(CHECKS).join("|")}>`);
  process.exit(1);
}

console.log(`\n=== verify:${checkId} ===\n`);
try {
  CHECKS[checkId]();
  console.log("✓", checkId);
  process.exit(0);
} catch (err) {
  console.error("✗", err instanceof Error ? err.message : err);
  process.exit(1);
}

#!/usr/bin/env node
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
  dashboard: () => {
    const errors = [];
    must(read("src/components/dashboard/overview-dashboard-panel.tsx"), "App Health Score", "overview health score", errors);
    must(read("src/components/create/workspace/app-dashboard-panel.tsx"), "OverviewDashboardPanel", "overview wired", errors);
    must(read("src/components/dashboard/dashboard-panels-p44.tsx"), "AnimatedLineChart", "analytics charts", errors);
    must(read("src/components/dashboard/dashboard-panels-p44.tsx"), "fetchDedupe", "dashboard fetch dedupe", errors);
    must(read("src/components/dashboard/code-dashboard-panel.tsx"), "code-dashboard-panel", "code dashboard", errors);
    must(read("src/components/integrations/app-project-secrets-panel.tsx"), "secrets-ai-setup-cta", "secrets ai cta", errors);
    must(read("src/components/create/workspace/app-dashboard-live-sections.tsx"), "security-scanner-panel", "security scanner ui", errors);
    must(read("src/components/publish/custom-domains-panel.tsx"), "Custom domain wizard", "domains hero wizard", errors);
    must(read("src/components/dashboard/app-settings-dashboard-panel.tsx"), "app-settings-dashboard-panel", "settings redesign", errors);
    must(read("src/app/api/projects/[id]/watermark/route.ts"), "watermarkDisabled", "watermark api", errors);
    must(read("src/lib/health/compute-app-health-score.ts"), "computeAppHealthScore", "server health score", errors);
    must(read("src/components/templates/app-template-settings-panel.tsx"), "Template card preview", "template live preview", errors);
    return errors;
  },
  community: () => {
    const errors = [];
    must(read("src/lib/community/trending-score.ts"), "discussionTrendingScore", "trending score", errors);
    must(read("src/components/community/community-view.tsx"), "sortByTrending", "trending wired", errors);
    must(read("src/components/community/group-chat-panel.tsx"), "group_messages", "group chat", errors);
    must(read("src/components/community/group-chat-panel.tsx"), "typing", "typing indicators", errors);
    must(read("supabase/migrations/20260825120000_p13_group_messages.sql"), "group_messages", "group messages migration", errors);
    must(read("supabase/migrations/20260826120000_p13_group_chat_enhancements.sql"), "last_read_at", "read receipts migration", errors);
    return errors;
  },
  certification: () => {
    const errors = [];
    must(read("src/lib/certification/scoring.ts"), "integrations_none", "honest integrations score", errors);
    must(read("src/lib/certification/checks/payments.ts"), "blocker", "honest payments blocker", errors);
    must(read("src/components/certification/certification-fix-issues-center.tsx"), "certification-fix-issues-center", "fix issues center", errors);
    return errors;
  },
  performance: () => {
    const errors = [];
    must(read("src/components/dashboard/dashboard-panels-p44.tsx"), "fetchDedupe", "analytics dedupe", errors);
    must(read("src/lib/cache/fetch-dedupe.ts"), "export async function fetchDedupe", "fetch dedupe lib", errors);
    must(read("src/lib/build/execute-staged-build-job.ts"), "isPreviewGateFailed", "preview gate unify", errors);
    return errors;
  },
  mobile: () => {
    const errors = [];
    must(read("src/app/globals.css"), "--vodex-mobile-bottom-nav-height", "mobile safe area var", errors);
    must(read("src/components/community/group-chat-panel.tsx"), "safe-area-inset-bottom", "group chat safe area", errors);
    must(read("src/components/publish/custom-domains-panel.tsx"), "Starter+ required", "domains mobile gate", errors);
    return errors;
  },
};

function runAll() {
  let failed = 0;
  for (const [name, fn] of Object.entries(suites)) {
    const errors = fn();
    if (errors.length) {
      failed += 1;
      console.error(`\n✗ ${name}`);
      errors.forEach((e) => console.error(`  - ${e}`));
    } else {
      console.log(`✓ ${name}`);
    }
  }
  if (failed) process.exit(1);
  console.log("\nAll P1.3 verification suites passed.");
}

if (!check) runAll();
else if (suites[check]) {
  const errors = suites[check]();
  if (errors.length) {
    errors.forEach((e) => console.error(e));
    process.exit(1);
  }
  console.log(`✓ ${check}`);
} else {
  console.error(`Unknown suite: ${check}`);
  process.exit(1);
}

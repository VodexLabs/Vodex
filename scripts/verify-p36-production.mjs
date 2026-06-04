#!/usr/bin/env node
/**
 * VODEX P3.6 — static verification bundle
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

const checks = {
  "notification-delivery": () => {
    const errors = [];
    const route = read("src/app/api/admin/notifications/broadcast/route.ts");
    const panel = read("src/components/admin/admin-inbox-messages-panel.tsx");
    const svc = read("src/lib/notifications/notification-service.ts");
    must(route, "verifiedCount", "broadcast verifiedCount", errors);
    must(route, "visibleToOwner", "broadcast owner visibility", errors);
    must(route, "resolveBroadcastRecipientIds", "owner inclusion resolver", errors);
    must(panel, "admin-send-inbox-test-me", "send test to me button", errors);
    must(panel, "AdminUserSearchSelect", "admin user search in inbox", errors);
    must(svc, "insertNotificationForUser", "canonical insert", errors);
    must(read("src/components/providers/app-provider.tsx"), "visibilitychange", "visibility refresh", errors);
    return errors;
  },
  "admin-user-search": () => {
    const errors = [];
    must(read("src/app/api/admin/users/search/route.ts"), "requireDreamosOwner", "owner guard", errors);
    const sel = read("src/components/admin/admin-user-search-select.tsx");
    if (!sel.includes("200") && !sel.includes("150") && !sel.includes("250")) {
      errors.push("150-250ms debounce");
    }
    return errors;
  },
  "status-automation": () => {
    const errors = [];
    must(read("src/lib/status/status-health-aggregator.ts"), "runStatusHealthAutomation", "aggregator", errors);
    must(read("src/app/api/admin/status/overview/route.ts"), "runStatusHealthAutomation", "overview refresh hook", errors);
    must(read("supabase/migrations/20260809121000_p36_status_automation_and_rls.sql"), "status_incidents_public_read", "RLS migration", errors);
    return errors;
  },
  "status-rls": () => {
    const errors = [];
    const mig = read("supabase/migrations/20260809121000_p36_status_automation_and_rls.sql");
    must(mig, "grant select on public.status_incidents", "incidents grant", errors);
    must(mig, "notify pgrst", "schema reload", errors);
    return errors;
  },
  "status-page": () => {
    const errors = [];
    must(read("src/app/api/status/public/route.ts"), "fetchPublicStatusPayload", "public status API", errors);
    must(read("src/lib/status/status-public.ts"), "createServiceRoleClient", "service role reads", errors);
    return errors;
  },
  "email-templates-premium": () => {
    const errors = [];
    const t = read("src/lib/email/marketing-email-templates.ts");
    must(t, "layout(", "email layout helper", errors);
    must(t, "preheader", "preheader field", errors);
    must(read("src/components/admin/email-marketing-preview.tsx"), "680px", "680px preview", errors);
    return errors;
  },
  "credit-upgrade-delta": () => {
    const errors = [];
    must(read("src/lib/billing/mid-cycle-upgrade-credits.ts"), "computeUpgradeCycleCredits", "upgrade delta math", errors);
    must(read("src/lib/billing/apply-admin-plan-change.ts"), "computeUpgradeCycleCredits", "admin uses delta", errors);
    return errors;
  },
  "credit-display-consistency": () => {
    const errors = [];
    must(read("src/lib/credits/canonical-credits.ts"), "project_id", "canonical user row", errors);
    return errors;
  },
  "pricing-page-stability": () => {
    const errors = [];
    const p = read("src/components/pricing/pricing-view.tsx");
    must(p, "INFINITY_SUFFIX_TO_TARGET", "infinity tier sync", errors);
    if (p.includes("router.refresh")) errors.push("pricing must not call router.refresh");
    return errors;
  },
  "preview-blocker-priority": () => {
    const errors = [];
    must(read("src/lib/preview/preview-blocker-priority.ts"), "VITE_BUILD_OOM", "OOM priority", errors);
    must(read("src/components/create/workspace/immersive-workspace.tsx"), "resolveAuthoritativePreviewBlocker", "workspace uses blocker", errors);
    return errors;
  },
  "zip-import-loading": () => {
    const errors = [];
    const z = read("src/components/apps/zip-import-wizard.tsx");
    must(z, "importProgress", "progress percent", errors);
    must(z, "Credits are currently", "reserved credits copy", errors);
    must(z, "z-[80]", "fullscreen overlay z-index", errors);
    return errors;
  },
};

const arg = process.argv[2];
if (!arg || arg === "all") {
  let failed = false;
  for (const [name, fn] of Object.entries(checks)) {
    const errors = fn();
    if (errors.length) {
      failed = true;
      console.error(`verify:${name} FAILED`);
      errors.forEach((e) => console.error(`  - ${e}`));
    } else {
      console.log(`verify:${name} OK`);
    }
  }
  process.exit(failed ? 1 : 0);
}

if (!checks[arg]) {
  console.error(`Unknown check: ${arg}`);
  process.exit(1);
}
const errors = checks[arg]();
if (errors.length) {
  console.error(`verify:${arg} FAILED\n`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}
console.log(`verify:${arg} OK`);

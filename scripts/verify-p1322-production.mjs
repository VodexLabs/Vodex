#!/usr/bin/env node
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
  "secret-guide-platform-detection": () => {
    const errors = [];
    must(read("src/lib/secrets/secret-guide-content.ts"), "detectSecretGuide", "guide detector", errors);
    must(read("src/lib/secrets/secret-guide-content.ts"), "Firebase Console", "firebase platform", errors);
    must(read("src/lib/secrets/secret-guide-content.ts"), "DEBUG_BLOCKS", "debug blocks guide", errors);
    must(read("src/components/import/imported-secrets-setup-panel.tsx"), "detectSecretGuide", "panel wired", errors);
    return errors;
  },
  "secret-guide-links": () => {
    const errors = [];
    must(read("src/lib/secrets/secret-guide-content.ts"), "console.firebase.google.com", "firebase link", errors);
    must(read("src/lib/secrets/secret-guide-content.ts"), "supabase.com/dashboard", "supabase link", errors);
    must(read("src/components/import/imported-secrets-setup-panel.tsx"), "guideContent.link", "link render", errors);
    return errors;
  },
  "zip-spa-routing": () => {
    const errors = [];
    must(read("src/lib/preview/inject-preview-virtual-history.ts"), "__VODEX_PREVIEW_ACTIVE__", "virtual history", errors);
    must(read("src/lib/preview/inject-preview-virtual-history.ts"), "Location.prototype", "pathname patch", errors);
    must(read("src/lib/preview/rewrite-preview-artifact-html.ts"), "rewriteAbsoluteVodexLinksInHtml", "vodex link rewrite", errors);
    must(read("src/app/api/projects/[id]/preview-assets/[...path]/route.ts"), "index.html", "spa fallback", errors);
    must(read("src/components/create/workspace/immersive-workspace.tsx"), "previewRoute,", "route in frame url", errors);
    return errors;
  },
  "preview-no-raw-vodex-iframe": () => {
    const errors = [];
    must(read("src/lib/preview/rewrite-preview-artifact-html.ts"), "isBlockedRawAppPreviewUrl", "block raw vodex", errors);
    must(read("src/components/create/workspace/preview-panel.tsx"), "rawUrlBlocked", "raw blocked diagnostics", errors);
    must(read("src/components/create/workspace/preview-panel.tsx"), "preview-diagnostics", "diagnostics strip", errors);
    return errors;
  },
  "zip-route-switcher-live": () => {
    const errors = [];
    must(read("src/lib/preview/rewrite-preview-artifact-html.ts"), "previewFrameUrlWithRoute", "frame url with route", errors);
    must(read("src/lib/preview/rewrite-preview-artifact-html.ts"), 'params.set("route"', "route query param", errors);
    mustNot(read("src/components/create/workspace/preview-panel.tsx"), "navigatePreviewIframe", "no postMessage escape", errors);
    return errors;
  },
  "public-deep-routes": () => {
    const errors = [];
    must(read("src/app/p/[slug]/[[...path]]/route.ts"), "normalizePublishedRoute", "public deep routes", errors);
    return errors;
  },
  "phone-auth-hidden": () => {
    const errors = [];
    mustNot(read("src/components/settings/app-auth-center.tsx"), 'id="phone"', "phone row removed", errors);
    mustNot(read("src/components/settings/app-auth-center.tsx"), "Phone number", "phone label removed", errors);
    return errors;
  },
  "google-managed-oauth": () => {
    const errors = [];
    must(read("src/components/settings/app-auth-center.tsx"), "Managed by Vodex", "managed badge", errors);
    must(read("src/components/settings/app-auth-center.tsx"), "Use Vodex-managed Google OAuth", "managed copy", errors);
    must(read("src/components/settings/app-auth-center.tsx"), "auth-provider-row-google-managed", "managed test id", errors);
    return errors;
  },
  "custom-google-oauth-setup-copy": () => {
    const errors = [];
    must(read("src/components/settings/custom-oauth-wizard.tsx"), "Authorized JavaScript origins", "google origins label", errors);
    must(read("src/components/settings/custom-oauth-wizard.tsx"), "Authorized redirect URIs", "google redirect label", errors);
    must(read("src/components/settings/custom-oauth-wizard.tsx"), "Paste this under Authorized redirect URIs", "redirect helper", errors);
    return errors;
  },
  "domain-dns-checker": () => {
    const errors = [];
    must(read("src/lib/publish/custom-domain-dns.ts"), "normalizeCustomDomainHostname", "hostname normalize", errors);
    must(read("src/lib/publish/custom-domain-dns.ts"), "apexRedirectNote", "apex note", errors);
    return errors;
  },
  "ionos-domain-guidance": () => {
    const errors = [];
    must(read("src/lib/publish/custom-domain-dns.ts"), "IONOS", "ionos guidance", errors);
    must(read("src/lib/publish/custom-domain-dns.ts"), "_vodex.www", "www txt label", errors);
    return errors;
  },
  "doubled-label-detection": () => {
    const errors = [];
    must(read("src/lib/publish/custom-domain-dns.ts"), "doubled label", "doubled label detection", errors);
    return errors;
  },
  "analytics-ranges": () => {
    const errors = [];
    must(read("src/components/dashboard/dashboard-panels-p44.tsx"), '"realtime"', "realtime period", errors);
    must(read("src/components/dashboard/dashboard-panels-p44.tsx"), '"24h"', "24h period", errors);
    must(read("src/components/dashboard/dashboard-panels-p44.tsx"), '"365d"', "year period", errors);
    return errors;
  },
  "analytics-axis-labels": () => {
    const errors = [];
    must(read("src/components/dashboard/dashboard-panels-p44.tsx"), "analytics-x-axis", "x axis test id", errors);
    must(read("src/components/dashboard/dashboard-panels-p44.tsx"), "formatXAxisLabels", "axis formatter", errors);
    return errors;
  },
  "analytics-tooltip": () => {
    const errors = [];
    must(read("src/components/dashboard/dashboard-panels-p44.tsx"), "analytics-chart-tooltip", "tooltip test id", errors);
    return errors;
  },
  "analytics-production-ui": () => {
    const errors = [];
    must(read("src/components/dashboard/dashboard-panels-p44.tsx"), "analytics-main-chart", "full width chart", errors);
    must(read("src/components/dashboard/dashboard-panels-p44.tsx"), "min-h-[320px]", "desktop min height", errors);
    mustNot(read("src/components/dashboard/dashboard-panels-p44.tsx"), "<Sparkline data={data.timeseriesByMetric", "no ugly card sparklines", errors);
    return errors;
  },
  "security-ui-blue-premium": () => {
    const errors = [];
    must(read("src/components/create/workspace/app-dashboard-live-sections.tsx"), "security-ui-blue-premium", "blue premium panel", errors);
    mustNot(read("src/components/create/workspace/app-dashboard-live-sections.tsx"), "from-slate-900 via-slate-900", "no black security card", errors);
    return errors;
  },
  "no-silent-build-gaps": () => {
    const errors = [];
    must(read("src/components/create/workspace/live-build-activity-panel.tsx"), "live-build-activity-panel", "activity panel", errors);
    must(read("src/components/create/workspace/agent-workflow-stream.tsx"), "LiveBuildActivityPanel", "panel wired", errors);
    return errors;
  },
  "live-build-activity-panel": () => {
    const errors = [];
    must(read("src/lib/build/live-build-activity.ts"), "modelStageActivityMessages", "stage messages", errors);
    must(read("src/components/create/workspace/live-build-activity-panel.tsx"), "live-build-status-line", "status line", errors);
    return errors;
  },
  "file-extraction-not-burst": () => {
    const errors = [];
    must(read("src/components/create/workspace/agent-workflow-stream.tsx"), "compressFileEventsForDisplay", "file compression", errors);
    must(read("src/components/create/workspace/live-file-line-delta.tsx"), "LiveFileLineDelta", "line deltas", errors);
    return errors;
  },
  "rich-build-narration": () => {
    const errors = [];
    must(read("src/lib/build/live-build-activity.ts"), "production app with these systems", "rich opener", errors);
    must(read("src/lib/workflow/workflow-ephemeral-steps.ts"), "modelStageActivityMessages", "ephemeral rich opener", errors);
    return errors;
  },
};

const only = process.argv[2];
const names = only && only !== "all" ? [only] : Object.keys(suites);
let failed = 0;
for (const name of names) {
  const fn = suites[name];
  if (!fn) {
    console.error(`Unknown suite: ${name}`);
    failed++;
    continue;
  }
  const errors = fn();
  if (errors.length) {
    console.error(`FAIL ${name}`);
    for (const e of errors) console.error(`  - ${e}`);
    failed++;
  } else {
    console.log(`OK ${name}`);
  }
}
process.exit(failed ? 1 : 0);

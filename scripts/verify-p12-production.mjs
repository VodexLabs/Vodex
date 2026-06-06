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

function mustNot(src, needle, label, errors) {
  if (src.includes(needle)) errors.push(label);
}

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      walk(p, acc);
    } else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
      acc.push(p);
    }
  }
  return acc;
}

const suites = {
  "dashboard-quality": () => {
    const errors = [];
    const panel = read("src/components/create/workspace/app-dashboard-panel.tsx");
    must(panel, "DashboardSectionNav", "dashboard section nav", errors);
    must(read("src/app/globals.css"), "--vodex-mobile-bottom-nav-height", "mobile nav css var", errors);
    return errors;
  },
  "mobile-readiness": () => {
    const errors = [];
    const report = read("src/lib/mobile/eligibility-report.ts");
    must(report, "CONFIG_SETUP_IDS", "config setup classification", errors);
    must(read("src/components/mobile/mobile-readiness-scan-modal.tsx"), "data-testid", "scan modal", errors);
    must(read("src/app/api/projects/[id]/readiness-scan/route.ts"), "mobile_readiness_scan_completed", "scan notification", errors);
    return errors;
  },
  community: () => {
    const errors = [];
    must(read("src/components/community/discussion-detail-drawer.tsx"), "discussion_replies", "replies table", errors);
    must(read("src/components/community/community-view.tsx"), "DiscussionDetailDrawer", "discussion drawer wired", errors);
    must(read("src/components/community/community-view.tsx"), "Create group", "create group cta", errors);
    return errors;
  },
  "auth-payments-integrations": () => {
    const errors = [];
    const catalog = read("src/lib/integrations/integrations-catalog.ts");
    mustNot(catalog, "openai", "no openai integration card", errors);
    mustNot(catalog, "anthropic", "no anthropic integration card", errors);
    must(read("src/lib/certification/checks/integrations.ts"), "connectedCount", "honest certification", errors);
    return errors;
  },
  "ui-no-native-dialogs": () => {
    const errors = [];
    const srcDir = path.join(root, "src");
    for (const file of walk(srcDir)) {
      const rel = path.relative(root, file).replace(/\\/g, "/");
      const src = fs.readFileSync(file, "utf8");
      if (src.includes("window.confirm(")) errors.push(`window.confirm in ${rel}`);
      if (src.includes("window.alert(")) errors.push(`window.alert in ${rel}`);
      if (src.includes("window.prompt(")) errors.push(`window.prompt in ${rel}`);
    }
    return errors;
  },
  "mobile-safe-area": () => {
    const errors = [];
    const css = read("src/app/globals.css");
    const shell = read("src/components/layout/platform-shell.tsx");
    const chat = read("src/components/chat/chat-view.tsx");
    must(css, "vodex-mobile-content-pad", "content pad class", errors);
    must(shell, "vodex-mobile-content-pad", "shell uses pad", errors);
    must(chat, "--vodex-mobile-bottom-nav-height", "chat composer safe area", errors);
    return errors;
  },
  "preview-routing": () => {
    const errors = [];
    const panel = read("src/components/create/workspace/preview-panel.tsx");
    must(panel, "Preview blocked", "iframe blocked fallback", errors);
    must(panel, "Open preview in new tab", "open in new tab action", errors);
    must(read("src/lib/preview/rewrite-preview-artifact-html.ts"), "preview-html", "artifact preview route", errors);
    return errors;
  },
};

const names = check ? [check] : Object.keys(suites);
let failed = false;

for (const name of names) {
  const fn = suites[name];
  if (!fn) {
    console.error(`Unknown suite: ${name}`);
    failed = true;
    continue;
  }
  const errors = fn();
  if (errors.length) {
    failed = true;
    console.error(`FAIL ${name}`);
    for (const e of errors) console.error(`  - ${e}`);
  } else {
    console.log(`OK ${name}`);
  }
}

process.exit(failed ? 1 : 0);

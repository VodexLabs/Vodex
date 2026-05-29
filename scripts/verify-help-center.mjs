#!/usr/bin/env node
/**
 * Static checks for Help Center docs, search, and UX.
 * Usage: node scripts/verify-help-center.mjs [check-name|all]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsPath = path.join(root, "src/lib/docs.ts");
const pagePath = path.join(root, "src/app/(app)/help/docs/[slug]/page.tsx");
const helpViewPath = path.join(root, "src/components/help/help-view.tsx");
const markdownPath = path.join(root, "src/lib/help-markdown.ts");
const searchPath = path.join(root, "src/lib/help-search.ts");

const docs = fs.readFileSync(docsPath, "utf8");
const page = fs.readFileSync(pagePath, "utf8");
const helpView = fs.readFileSync(helpViewPath, "utf8");
const markdown = fs.readFileSync(markdownPath, "utf8");

function fail(name, messages) {
  console.error(`verify:help-${name} FAILED`);
  for (const m of messages) console.error(`  - ${m}`);
  process.exit(1);
}

function pass(name) {
  console.log(`verify:help-${name} OK`);
}

function checkNoBrokenJsx() {
  const errs = [];
  if (page.includes("text-[14px] text-muted-foreground\">$1</li>")) {
    errs.push("help doc page still uses bracket classes before link pass (broken JSX risk)");
  }
  if (!page.includes("renderHelpMarkdown")) errs.push("help doc page must use renderHelpMarkdown");
  if (!page.includes("HelpDocBody")) errs.push("help doc page must use HelpDocBody");
  if (!markdown.includes("replace(/\\[(.+?)\\]\\((.+?)\\)/g")) {
    errs.push("help-markdown must process links before HTML classes with brackets");
  }
  if (errs.length) fail("no-broken-jsx", errs);
  pass("no-broken-jsx");
}

function checkOauthDomainAccuracy() {
  const errs = [];
  const oauth = docs.match(/slug: "oauth-setup"[\s\S]*?content: `([\s\S]*?)`,\s*\n  \},/);
  if (!oauth) {
    errs.push("oauth-setup article not found");
    fail("oauth-domain-accuracy", errs);
  }
  const content = oauth[1];
  if (!content.includes("DreamOS86 platform login")) errs.push("oauth-setup missing platform vs app separation");
  if (!content.includes("YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback")) {
    errs.push("oauth-setup missing Supabase provider callback");
  }
  if (!content.includes("YOUR_APP_DOMAIN") && !content.includes("APP_SLUG")) {
    errs.push("oauth-setup missing generated app domain placeholders");
  }
  const badBlock = content.match(/Add redirect URLs[\s\S]*?dreamos86\.com\/auth\/callback/);
  if (badBlock && !content.includes("platform login only")) {
    errs.push("oauth-setup lists dreamos86.com callback without platform-only context");
  }
  if (errs.length) fail("oauth-domain-accuracy", errs);
  pass("oauth-domain-accuracy");
}

function checkGeneratedAppPlaceholders() {
  const errs = [];
  for (const needle of ["YOUR_APP_DOMAIN", "APP_SLUG", "YOUR_SUPABASE_PROJECT", "YOUR_CUSTOM_DOMAIN"]) {
    if (!docs.includes(needle)) errs.push(`docs.ts missing placeholder ${needle}`);
  }
  if (errs.length) fail("generated-app-domain-placeholders", errs);
  pass("generated-app-domain-placeholders");
}

function checkFaqCoverage() {
  const errs = [];
  if (!docs.includes('slug: "help-faq"')) errs.push("missing help-faq article");
  const faq = docs.match(/slug: "help-faq"[\s\S]*?content: `([\s\S]*?)`,\s*\n  \},/);
  if (!faq) {
    fail("faq-coverage", errs);
  }
  const content = faq[1];
  const required = [
    "Which domain should I use for OAuth",
    "difference between DreamOS86 login",
    "custom domains affect OAuth",
    "redirect URI mismatch",
    "provider not enabled",
    "Stripe",
    "disputes",
    "own Supabase project",
    "Build Credits vs Action Credits",
    "publish a generated app",
    "Play Store",
    "OAuth works locally but not after publishing",
  ];
  for (const q of required) {
    if (!content.includes(q)) errs.push(`FAQ missing topic: ${q}`);
  }
  if (errs.length) fail("faq-coverage", errs);
  pass("faq-coverage");
}

function checkSearchKeywords() {
  const errs = [];
  if (!fs.existsSync(searchPath)) errs.push("missing help-search.ts");
  if (!docs.includes("keywords:")) errs.push("docs articles should define keywords for search");
  const searchSrc = fs.readFileSync(searchPath, "utf8");
  if (!docs.includes("redirect_uri_mismatch")) errs.push("docs should index redirect_uri_mismatch keyword");
  if (!helpView.includes("searchHelpArticles")) errs.push("help-view must use searchHelpArticles");
  for (const kw of ["Build Credits", "Action Credits", "Play Store", "RevenueCat"]) {
    if (!docs.includes(kw)) errs.push(`docs missing search keyword text: ${kw}`);
  }
  if (errs.length) fail("search-keywords", errs);
  pass("search-keywords");
}

function checkAnimationReducedMotion() {
  const errs = [];
  if (!helpView.includes("useReducedMotion")) errs.push("help-view must respect reduced motion");
  if (!helpView.includes("prefers-reduced-motion")) errs.push("help-view CSS must disable animation for reduced motion");
  if (!helpView.includes("Quick setup assistant")) errs.push("missing quick setup assistant section");
  if (errs.length) fail("animation-reduced-motion", errs);
  pass("animation-reduced-motion");
}

const checks = {
  "no-broken-jsx": checkNoBrokenJsx,
  "oauth-domain-accuracy": checkOauthDomainAccuracy,
  "generated-app-domain-placeholders": checkGeneratedAppPlaceholders,
  "faq-coverage": checkFaqCoverage,
  "search-keywords": checkSearchKeywords,
  "animation-reduced-motion": checkAnimationReducedMotion,
};

const arg = process.argv[2] ?? "all";
if (arg === "all") {
  for (const fn of Object.values(checks)) fn();
} else if (checks[arg]) {
  checks[arg]();
} else {
  console.error(`Unknown check: ${arg}`);
  process.exit(1);
}

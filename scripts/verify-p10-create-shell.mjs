#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv[2];

const page = fs.readFileSync(path.join(root, "src/app/(workspace)/create/page.tsx"), "utf8");
const body = fs.readFileSync(path.join(root, "src/components/create/create-page-body.tsx"), "utf8");
const island = fs.readFileSync(
  path.join(root, "src/components/create/create-server-composer-island.tsx"),
  "utf8",
);
const entry = fs.readFileSync(path.join(root, "src/components/create/create-workspace-entry.tsx"), "utf8");
const provider = fs.readFileSync(path.join(root, "src/components/providers/app-provider.tsx"), "utf8");
const warm = fs.readFileSync(path.join(root, "scripts/lib/create-composer-warmup.mjs"), "utf8");

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (check === "not-blocked-by-onboarding-cache") {
  if (!provider.includes('pathname.startsWith("/create")')) fail("create must be special-cased");
  if (provider.includes('router.replace("/onboarding")') && !provider.includes("isE2eCreditTestAccount")) {
    /* still redirects non-create routes */
  }
  const createIdx = provider.indexOf('if (pathname.startsWith("/create"))');
  const createSlice = createIdx >= 0 ? provider.slice(createIdx, createIdx + 450) : "";
  if (createSlice.includes('router.replace("/onboarding")')) {
    fail("must not redirect /create to onboarding");
  }
  if (!body.includes("create-onboarding-banner")) fail("missing onboarding banner on create");
  console.log("✓ create not blocked by onboarding cache");
} else if (check === "shell-before-auth-bootstrap") {
  if (page.includes("Loader2") && page.includes("Suspense")) fail("create page must not use spinner Suspense");
  if (!island.includes('data-testid="builder-shell"')) fail("server island missing builder-shell");
  if (!island.includes('data-testid="create-prompt-textarea"')) fail("server island missing textarea");
  if (!island.includes('data-testid="create-submit-button"')) fail("server island missing submit");
  if (!island.includes('data-testid="create-composer-ready"')) fail("server island missing ready marker");
  if (entry.match(/flex h-screen[\s\S]*Loader2/)) fail("entry must not use full-page spinner");
  const loadingTsx = fs.readFileSync(path.join(root, "src/app/(workspace)/create/loading.tsx"), "utf8");
  if (loadingTsx.includes("Loader2")) fail("create/loading.tsx must not use full-page spinner");
  if (loadingTsx.includes("CreateServerComposerIsland")) {
    fail("create/loading must not duplicate server shell (page body owns it)");
  }
  if (!warm.includes("CREATE_SHELL_NOT_VISIBLE")) fail("warm-up must fail fast with CREATE_SHELL_NOT_VISIBLE");
  if (!warm.includes("20000") && !warm.includes("20_000")) fail("warm-up must use 20s shell timeout");
  console.log("✓ create shell before auth bootstrap");
} else {
  fail(`unknown check: ${check}`);
}

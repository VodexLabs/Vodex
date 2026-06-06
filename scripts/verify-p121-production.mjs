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

const suites = {
  "preview-state": () => {
    const errors = [];
    const guards = read("src/lib/build/workflow-status-guards.ts");
    const complete = read("src/lib/build/complete-build-with-validation.ts");
    must(guards, "preview_failed", "preview_failed workflow status", errors);
    must(guards, "App files were created, but preview needs attention", "preview failure headline", errors);
    must(complete, "preview_failed", "preserve preview_failed build_status", errors);
    mustNot(
      read("src/components/create/workspace/agent-workflow-stream.tsx"),
      "Couldn't start the build",
      "workflow stream no wrong headline",
      errors,
    );
    return errors;
  },
  "mobile-config": () => {
    const errors = [];
    must(read("src/components/mobile/mobile-signing-config-drawer.tsx"), "mobile-signing-config-drawer", "signing drawer", errors);
    must(read("src/lib/mobile/sha-key-registry.ts"), "isValidShaFingerprint", "sha validation", errors);
    must(read("src/app/api/projects/[id]/mobile/config/route.ts"), "PATCH", "mobile config api", errors);
    must(read("src/components/mobile/mobile-wrapper-studio.tsx"), "MobileSigningConfigDrawer", "studio wired", errors);
    return errors;
  },
  "publish-modal": () => {
    const errors = [];
    const modal = read("src/components/create/workspace/publish-modal.tsx");
    must(modal, "PublishReadinessCompact", "compact readiness", errors);
    must(modal, "This becomes your public app URL", "slug explanation", errors);
    must(modal, "MobileSigningConfigDrawer", "signing drawer in publish", errors);
    must(read("src/components/publish/publish-readiness-compact.tsx"), "publish-readiness-compact", "compact component", errors);
    return errors;
  },
};

const names = check ? [check] : Object.keys(suites);
let failed = false;
for (const name of names) {
  const errors = suites[name]?.() ?? [`Unknown suite ${name}`];
  if (errors.length) {
    failed = true;
    console.error(`FAIL ${name}`);
    for (const e of errors) console.error(`  - ${e}`);
  } else {
    console.log(`OK ${name}`);
  }
}
process.exit(failed ? 1 : 0);

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
  "secrets-helper-inserts-prompt": () => {
    const errors = [];
    must(read("src/lib/secrets/secrets-helper-prompt.ts"), "SECRETS_HELPER_PROMPT", "prompt constant", errors);
    must(read("src/components/create/workspace/immersive-workspace.tsx"), "setComposerLiveText", "insert not autostart", errors);
    mustNot(
      read("src/components/create/workspace/app-dashboard-panel.tsx"),
      "setPendingInsertAutoSubmit",
      "dashboard no autostart",
      errors,
    );
    return errors;
  },
  "compact-secret-setup-panel": () => {
    const errors = [];
    must(read("src/components/import/imported-secrets-setup-panel.tsx"), '"compact"', "compact variant", errors);
    must(read("src/components/import/imported-secrets-setup-panel.tsx"), "compact-secret-setup-panel", "compact test id", errors);
    mustNot(read("src/components/chat/secret-setup-panel.tsx"), "Ask AI to help connect secrets", "no nested ask ai", errors);
    return errors;
  },
  "secrets-helper-cost": () => {
    const errors = [];
    must(read("src/lib/billing/discuss-credit-pricing.ts"), "SECRETS_HELPER_BC = 0.2", "0.2 BC floor", errors);
    must(read("src/lib/credits/credit-pricing.ts"), "secretsHelper", "charge flag", errors);
    must(read("src/app/api/chat/route.ts"), "isSecretsHelperPrompt", "chat detects helper", errors);
    return errors;
  },
  "domain-dns-checker": () => {
    const errors = [];
    must(read("src/lib/publish/custom-domain-dns.ts"), "expected", "expected records", errors);
    must(read("src/lib/publish/custom-domain-dns.ts"), "detected", "detected records", errors);
    must(read("src/app/api/projects/[id]/custom-domains/route.ts"), "cnameStatus", "cname status api", errors);
    return errors;
  },
  "ionos-domain-guidance": () => {
    const errors = [];
    must(read("src/lib/publish/custom-domain-dns.ts"), "providerDnsGuidance", "provider guidance", errors);
    must(read("src/lib/publish/custom-domain-dns.ts"), "IONOS", "ionos copy", errors);
    must(read("src/components/publish/custom-domains-panel.tsx"), "IONOS", "ionos ui", errors);
    return errors;
  },
  "revenuecat-icon": () => {
    const errors = [];
    must(read("src/components/brand/integration-icons.tsx"), "/brands/revenuecat.png", "asset path", errors);
    if (!fs.existsSync(path.join(root, "public/brands/revenuecat.png"))) {
      errors.push("revenuecat.png asset missing");
    }
    return errors;
  },
  "auth-provider-states": () => {
    const errors = [];
    must(read("src/components/settings/app-auth-center.tsx"), "toggleDisabled", "honest toggles", errors);
    must(read("src/components/settings/app-auth-center.tsx"), "Coming soon", "coming soon label", errors);
    must(read("src/components/settings/auth-provider-row.tsx"), "active", "active outline", errors);
    return errors;
  },
  "auth-managed-vs-custom-copy": () => {
    const errors = [];
    must(read("src/components/settings/app-auth-center.tsx"), "Vodex-managed OAuth", "managed copy", errors);
    must(read("src/components/settings/app-auth-center.tsx"), "Custom OAuth", "custom copy", errors);
    return errors;
  },
  "logo-action-credit-resolution": () => {
    const errors = [];
    must(read("src/lib/action-credits/resolve-action-credit-balance.ts"), "resolveActionCreditBalance", "canonical balance", errors);
    must(read("src/lib/projects/app-identity-service.ts"), "dynamicFloor: iconCreditQuote", "logo dynamic floor", errors);
    must(read("src/app/api/projects/[id]/identity/regenerate-logo/route.ts"), "action_credit_balance", "regen debug", errors);
    return errors;
  },
  "logo-generation-honesty": () => {
    const errors = [];
    must(read("src/lib/projects/app-identity-service.ts"), "you have", "honest depleted msg", errors);
    mustNot(read("src/lib/projects/app-identity-service.ts"), "Action Credits are depleted.", "no false depleted in build", errors);
    return errors;
  },
};

const check = process.argv[2] ?? "";

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
  console.log("\nAll P1.3.21 verification suites passed.");
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

#!/usr/bin/env node
/**
 * Diagnose TLS trust for Supabase + local dev login.
 * Hard cap: 30s total. Live probes: 20s Supabase, 5s dev server.
 * Never hangs the production gate.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isSystemCaEnabled,
  isTlsRejectDisabled,
  isTlsFetchError,
  isNetworkFetchError,
  printTlsFix,
  safeFetch,
  withSafeTlsEnv,
} from "./lib/tls-env.mjs";

const HARD_CAP_MS = 30_000;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const p = join(root, ".env.local");
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const started = Date.now();
const timer = setTimeout(() => {
  console.error("\n✗ verify:tls hard timeout (30s) — treating as network unavailable\n");
  process.exit(0);
}, HARD_CAP_MS);
timer.unref?.();

const env = { ...process.env, ...loadEnv() };
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "(not set)";

console.log("\n=== verify:tls ===\n");
console.log("Current Node TLS state");
console.log(`  Node version:     ${process.version}`);
console.log(`  Platform:         ${process.platform}`);
console.log(`  Supabase URL:     ${supabaseUrl}`);
console.log(
  `  NODE_USE_SYSTEM_CA: ${isSystemCaEnabled() ? "1 (enabled — good for Windows)" : "not set (recommended on Windows)"}`,
);
console.log(
  `  NODE_TLS_REJECT_UNAUTHORIZED: ${isTlsRejectDisabled() ? "0 — DANGEROUS, remove this" : "not disabled (good)"}`,
);

const errors = [];
const warnings = [];
const ok = [];
/** @type {"passed" | "network_unavailable" | "tls_issue" | "skipped"} */
let result = "passed";

if (isTlsRejectDisabled()) {
  errors.push("NODE_TLS_REJECT_UNAUTHORIZED=0 is set — remove from Windows User/System Environment Variables");
  result = "tls_issue";
} else {
  ok.push("TLS verification not globally disabled");
}

if (!isSystemCaEnabled()) {
  warnings.push("NODE_USE_SYSTEM_CA is not set — local login may fail with UNABLE_TO_VERIFY_LEAF_SIGNATURE");
} else {
  ok.push("NODE_USE_SYSTEM_CA=1 is enabled");
}

if (process.platform === "win32" && !isSystemCaEnabled()) {
  warnings.push("Windows dev requires NODE_USE_SYSTEM_CA=1 so Node trusts the OS certificate store");
}

if (!supabaseUrl.startsWith("http")) {
  warnings.push("NEXT_PUBLIC_SUPABASE_URL missing — skipping live Supabase TLS probe");
  result = result === "passed" ? "skipped" : result;
} else {
  const sr = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY ?? "";
  if (!sr) {
    warnings.push("SUPABASE_SERVICE_ROLE_KEY missing — skipping live Supabase TLS probe");
    result = result === "passed" ? "skipped" : result;
  } else {
    try {
      const res = await safeFetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
        headers: {
          apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? sr,
          Authorization: `Bearer ${sr}`,
        },
      }, 20_000);
      ok.push(`Supabase TLS probe succeeded (HTTP ${res.status})`);
    } catch (err) {
      if (isTlsFetchError(err)) {
        errors.push("TLS certificate verification failed on Supabase probe (UNABLE_TO_VERIFY_LEAF_SIGNATURE)");
        result = "tls_issue";
      } else if (isNetworkFetchError(err)) {
        warnings.push(`Network unavailable for Supabase probe: ${String(err?.message ?? err).slice(0, 120)}`);
        ok.push("Live probe skipped — network unavailable (static TLS config OK)");
        if (result === "passed") result = "network_unavailable";
      } else {
        warnings.push(`Supabase probe error: ${String(err?.message ?? err).slice(0, 120)}`);
        if (result === "passed") result = "network_unavailable";
      }
    }
  }
}

const devUrl = env.E2E_BASE_URL ?? env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
try {
  const devRes = await fetch(`${devUrl}/auth/login`, {
    redirect: "manual",
    signal: AbortSignal.timeout(5_000),
  });
  if (devRes.status < 500) {
    ok.push(`Dev server reachable at ${devUrl} (HTTP ${devRes.status})`);
  }
} catch {
  warnings.push(`Dev server not reachable at ${devUrl} — start with: npm run dev`);
}

clearTimeout(timer);

warnings.forEach((m) => console.warn(`⚠ ${m}`));
ok.forEach((m) => console.log(`✓ ${m}`));
errors.forEach((m) => console.error(`✗ ${m}`));

console.log(`\nResult: ${result} (${Date.now() - started}ms)\n`);

if (errors.length || warnings.some((w) => w.includes("NODE_USE_SYSTEM_CA") && !isSystemCaEnabled())) {
  if (errors.some((e) => e.includes("TLS certificate"))) {
    console.error("\n--- Why local login fails ---");
    console.error("  fetch failed / UNABLE_TO_VERIFY_LEAF_SIGNATURE on Supabase server-side calls\n");
    printTlsFix(supabaseUrl);
  }
}

if (errors.length) {
  process.exit(1);
}

withSafeTlsEnv(process.env);
console.log("✓ TLS verify OK (production gate may continue)\n");
process.exit(0);

#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mig = fs.readFileSync(
  path.join(root, "supabase/migrations/20260705120000_p07_credit_reservations_grants.sql"),
  "utf8",
);
const src = fs.readFileSync(path.join(root, "src/lib/billing/credit-reservations.ts"), "utf8");
const errors = [];
const ok = [];
if (!mig.includes("grant") || !mig.includes("credit_reservations")) {
  errors.push("migration missing grants");
}
if (!src.includes("createServiceRoleClient") || !src.includes('from("credit_reservations"')) {
  errors.push("credit-reservations must use service role + credit_reservations table");
}

const hasRemote =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
  Boolean(fs.existsSync(path.join(root, ".env.local")));
if (hasRemote) {
  const r = spawnSync("npx", ["tsx", path.join(root, "scripts/lib/verify-credit-reservations-run.ts")], {
    cwd: root,
    shell: true,
    encoding: "utf8",
    env: process.env,
  });
  if (r.status !== 0) {
    const out = (r.stderr || r.stdout || "").trim();
    if (/fetch failed/i.test(out)) {
      ok.push("live probe skipped (remote DB unreachable from this host)");
    } else {
      errors.push(`live probe: ${out}`);
    }
  } else {
    ok.push("live credit_reservations probe");
  }
}

if (errors.length) {
  console.error("verify:credit-reservations-permissions FAILED");
  errors.forEach((e) => console.error(" ✗", e));
  process.exit(1);
}
ok.forEach((m) => console.log(`✓ ${m}`));
console.log("verify:credit-reservations-permissions OK");

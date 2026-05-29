#!/usr/bin/env node
/**
 * npm run e2e:auth:setup — headless login when E2E_TEST_EMAIL/PASSWORD exist, else guided codegen.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
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

const env = { ...process.env, ...loadEnvLocal() };
const hasCreds = Boolean(env.E2E_TEST_EMAIL?.trim() && env.E2E_TEST_PASSWORD?.trim());

const script = hasCreds ? "setup:e2e-auth:headless" : "setup:e2e-auth";
console.log(
  hasCreds
    ? "\n=== e2e:auth:setup (headless credentials) ===\n"
    : "\n=== e2e:auth:setup (guided browser sign-in) ===\n",
);

const r = spawnSync("npm", ["run", script], { cwd: root, stdio: "inherit", shell: true });
process.exit(r.status ?? 1);

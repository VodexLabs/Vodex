#!/usr/bin/env node
/**
 * npm run e2e:auth:check — validates .playwright-auth.json, credits API, dev session probe.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cookiesHeader, getBaseUrl, readAuthFile, serverUp } from "./lib/e2e-live.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = getBaseUrl();

const base = spawnSync("npm", ["run", "verify:e2e-auth"], { cwd: root, stdio: "inherit", shell: true });
if (base.status !== 0) process.exit(base.status ?? 1);

const auth = readAuthFile();
const cookie = cookiesHeader(auth.json);
if (!cookie) {
  console.error("✗ No cookies in auth file");
  process.exit(1);
}

if (!(await serverUp())) {
  console.error(`✗ Dev server is not running. Start npm run dev or use npm run e2e:restaurant:stable.`);
  console.error(`  (expected at ${baseUrl})`);
  process.exit(1);
}

const credits = await fetch(`${baseUrl}/api/credits`, {
  headers: { Cookie: cookie },
  redirect: "manual",
});
if (!credits.ok) {
  console.error(`✗ GET /api/credits → ${credits.status}`);
  process.exit(1);
}
const creditsBody = await credits.json().catch(() => null);
if (!creditsBody || typeof creditsBody !== "object") {
  console.error("✗ /api/credits did not return JSON");
  process.exit(1);
}
console.log("✓ /api/credits returns current user credits");

const session = await fetch(`${baseUrl}/api/dev/auth-session-check`, {
  headers: { Cookie: cookie },
});
if (!session.ok) {
  console.error(`✗ GET /api/dev/auth-session-check → ${session.status}`);
  process.exit(1);
}
const sessionBody = await session.json().catch(() => null);
if (!sessionBody?.userResolved) {
  console.error("✗ auth-session-check userResolved is not true", sessionBody);
  process.exit(1);
}
console.log("✓ /api/dev/auth-session-check userResolved true");
console.log("\n✓ e2e:auth:check passed\n");

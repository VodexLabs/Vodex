#!/usr/bin/env node
/**
 * P1.3.8 — Fast closure orchestrator (manual QA + verify; stable suite optional/background).
 */
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { STABLE_BASE_URL, acquireStableDevServer, stopRunnerDevServer } from "./lib/stable-live-server.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "artifacts", "benchmarks", "p13");
const stableArtifactPath = path.join(outDir, "p138-final-stable-suite.json");
const cachePath = path.join(outDir, ".imported-project-cache.json");

const started = Date.now();
const result = {
  executed: false,
  pass: false,
  timestamp: new Date().toISOString(),
  project_id: null,
  typecheck: null,
  build: null,
  verify_p137: null,
  manual_qa_playwright: null,
  session_flash_playwright: null,
  test_live_stable: null,
  failed_step: null,
  root_cause: null,
  total_runtime_ms: 0,
};

function writeStableArtifact() {
  result.total_runtime_ms = Date.now() - started;
  result.timestamp = new Date().toISOString();
  try {
    const cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    result.project_id = cache.id ?? result.project_id;
  } catch {
    /* optional */
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(stableArtifactPath, JSON.stringify(result, null, 2));
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    shell: true,
    encoding: "utf8",
    env: { ...process.env, NODE_USE_SYSTEM_CA: process.env.NODE_USE_SYSTEM_CA ?? "1", ...opts.env },
    timeout: opts.timeoutMs ?? 120_000,
  });
  return { ok: r.status === 0, status: r.status, stdout: (r.stdout ?? "").slice(-4000), stderr: (r.stderr ?? "").slice(-2000) };
}

function fail(step, detail) {
  result.executed = true;
  result.pass = false;
  result.failed_step = step;
  result.root_cause = detail;
  writeStableArtifact();
  console.error(`\n✗ P1.3.8 failed: ${step}\n${detail}\n`);
  process.exit(1);
}

console.log("\n=== P1.3.8 typecheck ===\n");
result.typecheck = run("npm", ["run", "typecheck"], { timeoutMs: 90_000 });
if (!result.typecheck.ok) fail("typecheck", result.typecheck.stderr);

console.log("\n=== P1.3.8 build ===\n");
result.build = run("npm", ["run", "build"], { timeoutMs: 180_000 });
if (!result.build.ok) fail("build", result.build.stderr);

console.log("\n=== P1.3.8 verify scripts ===\n");
const verifyScripts = [
  "verify:intent-router",
  "verify:repair-flow-no-blueprint",
  "verify:auth-no-session-flash",
  "verify:live-diff-ui",
  "verify:zip-import-production-flow",
  "verify:imported-preview-state",
];
const verifyResults = [];
for (const script of verifyScripts) {
  const r = run("npm", ["run", script], { timeoutMs: 30_000 });
  verifyResults.push({ script, pass: r.ok });
  if (!r.ok) fail(script, r.stderr || r.stdout);
}
result.verify_p137 = { pass: true, scripts: verifyResults };

let serverState = null;
try {
  serverState = await acquireStableDevServer(root);
  const pwEnv = {
    E2E_RUN_LIVE: "1",
    E2E_BASE_URL: STABLE_BASE_URL,
    PLAYWRIGHT_BASE_URL: STABLE_BASE_URL,
    PLAYWRIGHT_SKIP_SERVER: "1",
    VODEX_REUSE_DEV_SERVER: "1",
  };

  console.log("\n=== P1.3.8 manual QA (Playwright) ===\n");
  const manualQa = run(
    "npx",
    ["playwright", "test", "tests/e2e/imported-reciply-manual-qa.spec.ts", "--workers=1", "--retries=0"],
    { env: pwEnv, timeoutMs: 120_000 },
  );
  result.manual_qa_playwright = { pass: manualQa.ok, status: manualQa.status };
  if (!manualQa.ok) fail("imported-reciply-manual-qa", manualQa.stderr || manualQa.stdout);

  console.log("\n=== P1.3.8 session flash (Playwright) ===\n");
  const sessionFlash = run(
    "npx",
    ["playwright", "test", "tests/e2e/p137-session-flash-qa.spec.ts", "--workers=1", "--retries=0"],
    { env: pwEnv, timeoutMs: 90_000 },
  );
  result.session_flash_playwright = { pass: sessionFlash.ok, status: sessionFlash.status };
  if (!sessionFlash.ok) fail("p137-session-flash-qa", sessionFlash.stderr || sessionFlash.stdout);
} finally {
  if (serverState?.startedByRunner) stopRunnerDevServer(serverState);
}

const runStable = process.env.P138_SKIP_STABLE !== "1";
if (runStable) {
  console.log("\n=== P1.3.8 test:live:stable (background) ===\n");
  const logPath = path.join(outDir, "p138-stable.log");
  const child = spawn("npm", ["run", "test:live:stable"], {
    cwd: root,
    shell: true,
    env: { ...process.env, NODE_USE_SYSTEM_CA: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logStream = fs.createWriteStream(logPath);
  child.stdout?.pipe(logStream);
  child.stderr?.pipe(logStream);

  const stableDeadline = Date.now() + 12 * 60_000;
  let stableGo = false;
  let stableOk = false;
  while (Date.now() < stableDeadline) {
    await new Promise((r) => setTimeout(r, 15_000));
    if (child.exitCode !== null) {
      stableOk = child.exitCode === 0;
      break;
    }
    try {
      const liveRun = JSON.parse(fs.readFileSync(path.join(outDir, "live-stable-run.json"), "utf8"));
      if (liveRun.final_go_no_go === "GO") {
        stableGo = true;
        stableOk = true;
        break;
      }
    } catch {
      /* still running */
    }
  }
  if (child.exitCode === null) child.kill("SIGTERM");

  result.test_live_stable = {
    pass: stableOk && stableGo,
    final_go_no_go: stableGo ? "GO" : "NO-GO",
    log: logPath,
  };
  if (!stableOk || !stableGo) {
    fail("test:live:stable", `stable_go=${stableGo} log=${logPath}`);
  }
} else {
  const livePath = path.join(outDir, "live-stable-run.json");
  const liveRun = JSON.parse(fs.readFileSync(livePath, "utf8"));
  const stableGo = liveRun.final_go_no_go === "GO";
  result.test_live_stable = { pass: stableGo, final_go_no_go: liveRun.final_go_no_go, reused: livePath };
  if (!stableGo) fail("test:live:stable", "existing live-stable-run.json is not GO");
}

result.executed = true;
result.pass = true;
writeStableArtifact();
console.log("\n✓ P1.3.8 closure GO\n");
process.exit(0);

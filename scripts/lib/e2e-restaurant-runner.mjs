/**
 * Shared restaurant E2E runner (stable + local).
 */
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { devServerBaseUrl, diagnoseDevServer, killPortProcessSafely } from "./dev-server.mjs";
import { ensureE2eDevServerReady } from "./e2e-dev-server-readiness.mjs";
import { readAuthFile, cookiesHeader } from "./e2e-live.mjs";
import { assertE2eCreditsSufficient } from "./verify-e2e-credits-api.mjs";
import { warmCreateComposerPage } from "./create-composer-warmup.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const QA_REPORT = path.join(root, "tests/e2e/evidence/restaurant-qa-report.json");
const DEV_LOG = path.join(root, "tests/e2e/evidence/restaurant-dev-server.log");
const EVIDENCE_DIR = path.join(root, "tests/e2e/evidence");
const QUEUE_ONLY_MARKER = path.join(EVIDENCE_DIR, ".e2e-queue-only-passed.json");

function queueOnlyMarkerFresh(maxAgeMs = 45 * 60_000) {
  try {
    const raw = fs.readFileSync(QUEUE_ONLY_MARKER, "utf8");
    const { passedAt } = JSON.parse(raw);
    const at = new Date(passedAt).getTime();
    return Number.isFinite(at) && Date.now() - at < maxAgeMs;
  } catch {
    return false;
  }
}
const STALE_RESTAURANT_E2E_EVIDENCE = [
  "restaurant-qa-report.json",
  "preview-render-failure.json",
  "final-restaurant-e2e-failure.json",
];

export function clearStaleRestaurantE2eEvidence() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  for (const name of STALE_RESTAURANT_E2E_EVIDENCE) {
    try {
      fs.unlinkSync(path.join(EVIDENCE_DIR, name));
    } catch {
      /* missing */
    }
  }
}

export function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, NODE_USE_SYSTEM_CA: process.env.NODE_USE_SYSTEM_CA ?? "1", ...opts.env },
  });
  return r.status ?? 1;
}

export function writeFail(stage, errors) {
  fs.mkdirSync(path.dirname(QA_REPORT), { recursive: true });
  fs.writeFileSync(
    QA_REPORT,
    JSON.stringify(
      { startedAt: new Date().toISOString(), passed: false, failedStage: stage, errors },
      null,
      2,
    ),
  );
}

async function startDevServer() {
  fs.mkdirSync(path.dirname(DEV_LOG), { recursive: true });
  fs.writeFileSync(DEV_LOG, `[${new Date().toISOString()}] dev server starting\n`);
  console.log("[dev-server] Starting npm run dev…\n");
  const logStream = fs.createWriteStream(DEV_LOG, { flags: "a" });
  const proc = spawn("npm run dev", {
    cwd: root,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_USE_SYSTEM_CA: process.env.NODE_USE_SYSTEM_CA ?? "1" },
  });
  const pipe = (chunk) => {
    process.stdout.write(chunk);
    logStream.write(chunk);
  };
  proc.stdout?.on("data", pipe);
  proc.stderr?.on("data", pipe);
  proc.on("close", (code) => {
    logStream.write(`\n[${new Date().toISOString()}] dev server exited ${code}\n`);
    logStream.end();
  });
  return proc;
}

/**
 * @param {{ mode: 'stable' | 'local' }} opts
 */
export async function runRestaurantE2e({ mode }) {
  const base = devServerBaseUrl();
  const auth = readAuthFile();
  const cookie = auth.ok ? cookiesHeader(auth.json) : null;

  let devProc = null;
  let weStartedDev = false;
  let readinessMs = 0;

  if (mode === "stable") {
    const kill = killPortProcessSafely(3000);
    if (kill.killed) {
      console.log(`[dev-server] Cleared port 3000 (PID ${kill.pid})`);
      await new Promise((r) => setTimeout(r, 2500));
    }

    let diag = await diagnoseDevServer(base);
    if (diag.state !== "healthy") {
      devProc = await startDevServer();
      weStartedDev = Boolean(devProc);
      if (!devProc) {
        writeFail("dev_server", [diag.message ?? "could not start dev server"]);
        return { exitCode: 1, mode, readinessMs: 0 };
      }
    }
  } else {
    console.log("[e2e] Local mode — reuse healthy dev on :3000; recover stuck listener only before Playwright\n");
    let diag = await diagnoseDevServer(base);
    if (diag.state === "broken") {
      const kill = killPortProcessSafely(3000);
      if (kill.killed) {
        console.log(`[e2e] Killed stuck Node on port 3000 (PID ${kill.pid}) — not touching port during Playwright\n`);
        await new Promise((r) => setTimeout(r, 2500));
      } else {
        console.log(`[e2e] Port 3000 broken but could not kill PID ${kill.pid ?? "?"} (${kill.reason ?? "unknown"})\n`);
      }
      diag = await diagnoseDevServer(base);
    }
    if (diag.state === "down" || diag.state === "broken") {
      console.log("[e2e] Starting dev server on port 3000…\n");
      devProc = await startDevServer();
      weStartedDev = Boolean(devProc);
      if (!devProc) {
        writeFail("dev_server", [diag.message ?? "could not start dev server"]);
        return { exitCode: 1, mode, readinessMs: 0 };
      }
    }
  }

  const ready = await ensureE2eDevServerReady({
    baseUrl: base,
    cookie,
    devLogPath: DEV_LOG,
    onTick: (msg) => console.log(`[dev-server] ${msg}`),
  });
  readinessMs = ready.readinessMs ?? ready.pingMs ?? 0;

  if (!ready.ok) {
    const err = [
      ready.message ?? "dev server not ready",
      ready.warmCapture ? JSON.stringify(ready.warmCapture).slice(0, 500) : "",
    ].filter(Boolean);
    writeFail("dev_server", err);
    if (weStartedDev && devProc) devProc.kill("SIGTERM");
    return { exitCode: 1, mode, readinessMs };
  }

  console.log(`[dev-server] ✓ ready in ~${Math.round(readinessMs / 1000)}s\n`);

  if (run("npm", ["run", "e2e:credits:prepare"], { env: { E2E_RUN_LIVE: "1" } }) !== 0) {
    writeFail("credits", ["e2e:credits:prepare failed"]);
    if (weStartedDev && devProc) devProc.kill("SIGTERM");
    return { exitCode: 1, mode, readinessMs };
  }

  const skipBrowserWarmup =
    mode === "local" && process.env.E2E_FORCE_COMPOSER_WARMUP !== "1";
  if (skipBrowserWarmup) {
    console.log("[e2e] Local mode — skipping Playwright composer warm-up (HTTP /create warmup only)\n");
  } else {
    const composerWarm = await warmCreateComposerPage();
    if (!composerWarm.ok) {
      writeFail("create_interactive", [
        `create composer warm-up failed: ${composerWarm.error ?? "unknown"}`,
      ]);
      if (weStartedDev && devProc) devProc.kill("SIGTERM");
      return { exitCode: 1, mode, readinessMs };
    }
  }

  if (run("npm", ["run", "e2e:auth:check"]) !== 0) {
    writeFail("auth", ["e2e:auth:check failed — run npm run e2e:auth:setup"]);
    if (weStartedDev && devProc) devProc.kill("SIGTERM");
    return { exitCode: 1, mode, readinessMs };
  }

  let creditCheck = await assertE2eCreditsSufficient();
  if (!creditCheck.ok && /fetch failed|socket|closed/i.test(creditCheck.message ?? "")) {
    console.log("[e2e] Credits check failed during dev compile — waiting 8s, retrying…\n");
    await new Promise((r) => setTimeout(r, 8_000));
    creditCheck = await assertE2eCreditsSufficient();
  }
  if (!creditCheck.ok) {
    writeFail("credits", [`${creditCheck.code}: ${creditCheck.message}`]);
    if (weStartedDev && devProc) devProc.kill("SIGTERM");
    return { exitCode: 1, mode, readinessMs };
  }

  const playwrightEnv = {
    PLAYWRIGHT_SKIP_SERVER: "1",
    PLAYWRIGHT_BASE_URL: base,
    DREAMOS_INLINE_ASYNC_BUILD: "1",
    E2E_RUN_LIVE: "1",
    E2E_AUTH_CHECK_PASSED: "1",
    ...(mode === "local" ? { E2E_SKIP_BROWSER_AUTH_PROBE: "1", E2E_RESTAURANT_LOCAL: "1" } : {}),
    ...(mode === "local" && queueOnlyMarkerFresh()
      ? { E2E_SKIP_INLINE_QUEUE: "1" }
      : {}),
  };

  if (mode === "local" && playwrightEnv.E2E_SKIP_INLINE_QUEUE === "1") {
    console.log(
      "[e2e] Fresh queue-only pass marker — full spec skips duplicate inline queue (run e2e:restaurant:queue-only first)\n",
    );
  }

  if (mode !== "local") {
    console.log("[e2e] Auth probe (Playwright browser context)…\n");
    if (
      run("npx", ["playwright", "test", "tests/e2e/e2e-auth-probe.spec.ts", "--grep", "@live"], {
        env: playwrightEnv,
      }) !== 0
    ) {
      writeFail("auth", ["E2E_AUTH_UNRESOLVED — see tests/e2e/evidence/restaurant-final-failure.json"]);
      if (weStartedDev && devProc) devProc.kill("SIGTERM");
      return { exitCode: 1, mode, readinessMs };
    }
  } else {
    console.log("[e2e] Local mode — skipping duplicate auth probe (e2e:auth:check passed)\n");
  }

  if (mode !== "local" && process.env.E2E_RESTAURANT_FULL_PREFLIGHT === "1") {
    if (
      run("npx", ["playwright", "test", "tests/e2e/create-submit-enable.spec.ts", "--timeout=180000"], {
        env: playwrightEnv,
      }) !== 0
    ) {
      writeFail("create_interactive", ["create-submit-enable preflight failed"]);
      if (weStartedDev && devProc) devProc.kill("SIGTERM");
      return { exitCode: 1, mode, readinessMs };
    }
  } else if (mode === "local") {
    console.log("[e2e] Local mode — skipping create-submit-enable preflight (static verify already ran)\n");
  }

  clearStaleRestaurantE2eEvidence();
  console.log("[e2e] Cleared stale restaurant QA/preview/final-failure evidence\n");

  const skipPreflight = process.env.E2E_SKIP_RESTAURANT_PREFLIGHT === "1";
  if (!skipPreflight) {
    if (run("npm", ["run", "typecheck"]) !== 0) {
      writeFail("dev_server", ["typecheck failed"]);
      if (weStartedDev && devProc) devProc.kill("SIGTERM");
      return { exitCode: 1, mode, readinessMs };
    }
    if (mode !== "local") {
      console.log("[e2e] Running restaurant enqueue smoke…\n");
      let enqueueSmokeExit = run("npm", ["run", "e2e:restaurant:enqueue-smoke"], { env: playwrightEnv });
      if (enqueueSmokeExit !== 0) {
        console.log("[e2e] Enqueue smoke failed — waiting 15s, one retry…\n");
        await new Promise((r) => setTimeout(r, 15_000));
        enqueueSmokeExit = run("npm", ["run", "e2e:restaurant:enqueue-smoke"], { env: playwrightEnv });
      }
      if (enqueueSmokeExit !== 0) {
        writeFail("chat_enqueue", ["restaurant enqueue smoke failed"]);
        if (weStartedDev && devProc) devProc.kill("SIGTERM");
        return { exitCode: 1, mode, readinessMs };
      }
    } else {
      console.log("[e2e] Local mode — skipping enqueue smoke (run separately if needed)\n");
    }
    console.log("[e2e] Running restaurant queue-only (must pass before full E2E)…\n");
    const queueOnlyExit = run("npm", ["run", "e2e:restaurant:queue-only"], { env: playwrightEnv });
    if (queueOnlyExit !== 0) {
      writeFail("queue", ["restaurant queue-only failed — see tests/e2e/evidence/queue-failure.json"]);
      if (weStartedDev && devProc) devProc.kill("SIGTERM");
      return { exitCode: 1, mode, readinessMs };
    }
    console.log("[e2e] Queue-only passed — 10s settle before full E2E…\n");
    await new Promise((r) => setTimeout(r, 10_000));
  }

  const pw = run(
    "npx",
    [
      "playwright",
      "test",
      "tests/e2e/restaurant-inventory-workflow.spec.ts",
      "--grep",
      "@live",
      "--workers=1",
      "--timeout=600000",
    ],
    { env: playwrightEnv },
  );

  if (fs.existsSync(QA_REPORT)) {
    console.log(`\n[e2e] QA report: ${QA_REPORT}\n`);
    try {
      const report = JSON.parse(fs.readFileSync(QA_REPORT, "utf8"));
      if (report.failedStage) console.log(`[e2e] Failed stage: ${report.failedStage}`);
      if (report.errors?.length) console.log(`[e2e] Errors: ${report.errors.join("; ")}`);
    } catch {
      /* ignore */
    }
  }

  if (weStartedDev && devProc) {
    console.log("\n[dev-server] Stopping dev server started for E2E…\n");
    devProc.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 2000));
  }

  return { exitCode: pw, mode, readinessMs };
}

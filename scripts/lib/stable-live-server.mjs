/**
 * Single-server orchestration for stable live E2E (P1.3.4 / P1.3.6).
 * Safe health recovery between heavy steps; never two dev servers.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  assessDevServerRestartSafety,
  devServerBaseUrl,
  diagnoseDevServer,
  getProcessCommandLine,
  isLikelyNodeDevServer,
  isLikelyVodexDevProcess,
  killPortProcessSafely,
  portHolderPid,
  probeHealthEndpoints,
} from "./dev-server.mjs";

export const STABLE_BASE_URL = "http://localhost:3000";
export const MAX_STABLE_RUNTIME_MS = 30 * 60 * 1000;
export const HEALTH_TIMEOUT_MS = 120_000;
export const QUICK_PROBE_MS = 8_000;
export const RECOVERY_MAX_MS = 180_000;

export const OWNERSHIP = {
  RUNNER_STARTED: "runner_started",
  REUSED_HEALTHY: "reused_healthy",
  REUSED_RESTARTED: "reused_then_restarted_after_unhealthy",
  BLOCKED_UNKNOWN: "blocked_unknown_process",
};

export function reuseDevServerEnv() {
  return process.env.VODEX_REUSE_DEV_SERVER === "1";
}

export function canRestartReusedDevServer() {
  if (process.env.VODEX_ALLOW_RESTART_REUSED_DEV === "0") return false;
  if (process.env.VODEX_ALLOW_RESTART_REUSED_DEV === "1") return true;
  return (
    process.env.E2E_RUN_LIVE === "1" ||
    process.env.PLAYWRIGHT_SKIP_SERVER === "1" ||
    process.argv.some((a) => a.includes("test-live-stable"))
  );
}

export function stableLogPath(root) {
  return path.join(root, "artifacts", "benchmarks", "p13", "live-server.log");
}

export function appendServerLog(root, line) {
  const logPath = stableLogPath(root);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${line}\n`);
}

export async function probeVodexHealth(baseUrl = STABLE_BASE_URL, timeoutMs = 5_000) {
  const base = baseUrl.replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/health`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { vodex: false, status: res.status };
    const body = await res.json();
    if (body?.ok === true && body?.app === "vodex") {
      return { vodex: true, status: res.status, body };
    }
    return { vodex: false, status: res.status, body };
  } catch (err) {
    return { vodex: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** True when an existing listener responds as Vodex (health or dev ping fallback). */
export async function isExistingVodexServer(baseUrl = STABLE_BASE_URL) {
  const health = await probeVodexHealth(baseUrl);
  if (health.vodex) return { ok: true, via: "api/health", ...health };

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/dev/ping`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (res.ok) {
      const body = await res.json().catch(() => ({}));
      if (body?.ok === true) return { ok: true, via: "api/dev/ping", status: res.status };
    }
  } catch {
    /* */
  }
  return { ok: false, health };
}

/** Quick dual-endpoint health check for recovery boundaries. */
export async function quickHealthCheck(baseUrl = STABLE_BASE_URL, timeoutMs = QUICK_PROBE_MS) {
  const probe = await probeHealthEndpoints(baseUrl, timeoutMs);
  if (probe.healthy) {
    return {
      healthy: true,
      via: probe.health.ok ? "api/health" : "api/dev/ping",
      health: probe.health,
      ping: probe.ping,
    };
  }
  const reasons = [];
  if (!probe.health.ok) {
    reasons.push(`health: ${probe.health.error ?? `HTTP ${probe.health.status}`}`);
  }
  if (!probe.ping.ok) {
    reasons.push(`ping: ${probe.ping.error ?? `HTTP ${probe.ping.status}`}`);
  }
  return {
    healthy: false,
    reason: reasons.join("; ") || "server_unhealthy",
    health: probe.health,
    ping: probe.ping,
  };
}

/** Retry health probes — dev server may be slow compiling after heavy builds. */
export async function quickHealthCheckWithRetry(
  baseUrl = STABLE_BASE_URL,
  { attempts = 3, pauseMs = 6_000, timeoutMs = QUICK_PROBE_MS } = {},
) {
  let last = null;
  for (let i = 0; i < attempts; i++) {
    last = await quickHealthCheck(baseUrl, timeoutMs);
    if (last.healthy) return last;
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, pauseMs));
    }
  }
  return last;
}

function spawnStableDevServer(root, baseUrl) {
  const logPath = stableLogPath(root);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, `=== stable live server log ${new Date().toISOString()} ===\n`);
  }

  const logFd = fs.openSync(logPath, "a");
  const proc = spawn("npm run dev", {
    cwd: root,
    env: {
      ...process.env,
      NODE_USE_SYSTEM_CA: process.env.NODE_USE_SYSTEM_CA ?? "1",
      NODE_OPTIONS: [process.env.NODE_OPTIONS, "--max-old-space-size=8192"].filter(Boolean).join(" "),
      E2E_BASE_URL: baseUrl,
      PLAYWRIGHT_BASE_URL: baseUrl,
    },
    stdio: ["ignore", logFd, logFd],
    shell: true,
  });

  return proc;
}

async function warmStableRoutes(baseUrl, root) {
  const paths = ["/api/health", "/api/dev/ping", "/explore", "/auth/login", "/create"];
  for (const p of paths) {
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}${p}`, {
        signal: AbortSignal.timeout(60_000),
      });
      appendServerLog(root, `[stable-server] warm ${p} → ${res.status}`);
    } catch (err) {
      appendServerLog(
        root,
        `[stable-server] warm ${p} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

export async function waitForHealth(baseUrl, timeoutMs = HEALTH_TIMEOUT_MS, root = null) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const health = await probeVodexHealth(baseUrl, 15_000);
    if (health.vodex) return { ok: true, via: "api/health", elapsed: Date.now() - start };

    const quick = await quickHealthCheck(baseUrl, Math.min(QUICK_PROBE_MS, 15_000));
    if (quick.healthy) {
      return { ok: true, via: quick.via, elapsed: Date.now() - start };
    }

    const diag = await diagnoseDevServer(baseUrl);
    if (diag.state === "healthy") {
      return { ok: true, via: diag.http?.url ?? "probe", elapsed: Date.now() - start };
    }

    if (root) {
      appendServerLog(
        root,
        `[stable-server] waiting for health… ${Math.round((Date.now() - start) / 1000)}s`,
      );
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  return { ok: false, elapsed: Date.now() - start };
}

/**
 * Start a fresh dev server (caller must ensure port is free).
 * @returns {Promise<{ startedByRunner: boolean, pid: string | null, process: import('node:child_process').ChildProcess, baseUrl: string, ownershipMode: string }>}
 */
export async function startFreshStableDevServer(root, baseUrl = devServerBaseUrl()) {
  appendServerLog(root, `[stable-server] Starting fresh dev server at ${baseUrl}…`);
  const proc = spawnStableDevServer(root, baseUrl);

  const wait = await waitForHealth(baseUrl, HEALTH_TIMEOUT_MS, root);
  if (!wait.ok) {
    try {
      proc.kill();
    } catch {
      /* */
    }
    throw new Error(`Dev server failed to become healthy within ${HEALTH_TIMEOUT_MS / 1000}s`);
  }

  await warmStableRoutes(baseUrl, root);

  const listenerPid = portHolderPid(3000) ?? String(proc.pid ?? "");
  appendServerLog(root, `[stable-server] Ready PID ${listenerPid} (${wait.via})`);
  return {
    startedByRunner: true,
    pid: listenerPid,
    process: proc,
    baseUrl,
    ownershipMode: OWNERSHIP.RUNNER_STARTED,
  };
}

/**
 * Acquire exactly one dev server for stable live run.
 * @returns {Promise<{ startedByRunner: boolean, pid: string | null, process: import('node:child_process').ChildProcess | null, baseUrl: string, ownershipMode: string }>}
 */
export async function acquireStableDevServer(root) {
  const baseUrl = devServerBaseUrl();
  const pid = portHolderPid(3000);

  if (pid) {
    const existing = await isExistingVodexServer(baseUrl);
    if (existing.ok) {
      appendServerLog(root, `[stable-server] Reusing Vodex dev server PID ${pid} at ${baseUrl}`);
      return {
        startedByRunner: false,
        pid,
        process: null,
        baseUrl,
        ownershipMode: OWNERSHIP.REUSED_HEALTHY,
      };
    }

    if (isLikelyNodeDevServer(pid)) {
      appendServerLog(
        root,
        `[stable-server] Stale Node listener PID ${pid} on :3000 (not healthy) — clearing once before start`,
      );
      killPortProcessSafely(3000);
      await new Promise((r) => setTimeout(r, 2500));
      const afterPid = portHolderPid(3000);
      if (afterPid) {
        const msg = `Port 3000 still occupied by PID ${afterPid} after clearing stale Node listener.`;
        appendServerLog(root, `[stable-server] BLOCKED: ${msg}`);
        throw new Error(msg);
      }
    } else {
      const diag = await diagnoseDevServer(baseUrl);
      const cmd = getProcessCommandLine(pid);
      const msg =
        `Port 3000 is occupied by unknown process PID ${pid}` +
        (cmd ? ` (${cmd.slice(0, 120)})` : "") +
        `. HTTP state: ${diag.state}. Stop the process manually before running test:live:stable.`;
      appendServerLog(root, `[stable-server] BLOCKED: ${msg}`);
      throw Object.assign(new Error(msg), {
        ownershipMode: OWNERSHIP.BLOCKED_UNKNOWN,
        pid,
        command: cmd,
      });
    }
  }

  return startFreshStableDevServer(root, baseUrl);
}

/**
 * Stop unhealthy dev server and start one clean instance.
 */
export async function restartStableDevServer(root, serverState) {
  const baseUrl = serverState?.baseUrl ?? STABLE_BASE_URL;
  const oldPid = portHolderPid(3000) ?? serverState?.pid ?? null;

  if (!oldPid) {
    appendServerLog(root, `[stable-server] Port 3000 free — starting fresh dev server…`);
    const fresh = await startFreshStableDevServer(root, baseUrl);
    return {
      ...fresh,
      ownershipMode: serverState?.startedByRunner
        ? OWNERSHIP.RUNNER_STARTED
        : OWNERSHIP.REUSED_RESTARTED,
    };
  }

  appendServerLog(root, `[stable-server] Restarting dev server (old PID ${oldPid})…`);

  if (serverState?.startedByRunner && serverState?.process) {
    stopRunnerDevServer(serverState, root);
  } else if (oldPid && isLikelyVodexDevProcess(oldPid)) {
    killPortProcessSafely(3000);
  } else if (oldPid) {
    const cmd = getProcessCommandLine(oldPid);
    throw Object.assign(
      new Error(`Cannot restart: PID ${oldPid} is not a safe Vodex dev process${cmd ? `: ${cmd.slice(0, 100)}` : ""}`),
      { ownershipMode: OWNERSHIP.BLOCKED_UNKNOWN, pid: oldPid, command: cmd },
    );
  }

  await new Promise((r) => setTimeout(r, 3000));

  const stillHeld = portHolderPid(3000);
  if (stillHeld && stillHeld !== oldPid) {
    const safety = assessDevServerRestartSafety(stillHeld);
    if (!safety.safe) {
      throw Object.assign(new Error(`Port 3000 still held by unsafe PID ${stillHeld}`), {
        ownershipMode: OWNERSHIP.BLOCKED_UNKNOWN,
        pid: stillHeld,
        command: safety.command,
      });
    }
    killPortProcessSafely(3000);
    await new Promise((r) => setTimeout(r, 2500));
  }

  const newState = await startFreshStableDevServer(root, baseUrl);
  return {
    ...newState,
    ownershipMode: serverState?.startedByRunner
      ? OWNERSHIP.RUNNER_STARTED
      : OWNERSHIP.REUSED_RESTARTED,
  };
}

/**
 * Recovery boundary between heavy stable steps.
 * @returns {{ serverState: object, event: object | null }}
 */
export async function recoverBetweenSteps(afterStep, serverState, root) {
  const baseUrl = serverState?.baseUrl ?? STABLE_BASE_URL;
  const recoveryStarted = Date.now();
  const oldPid = portHolderPid(3000) ?? serverState?.pid ?? null;

  appendServerLog(root, `[stable-server] recovery check after ${afterStep} (PID ${oldPid ?? "none"})`);

  const check = await quickHealthCheckWithRetry(baseUrl, { attempts: 3, pauseMs: 6_000 });
  if (check.healthy) {
    appendServerLog(root, `[stable-server] recovery skipped — healthy via ${check.via}`);
    return { serverState, event: null };
  }

  const reason = check.reason ?? "server_unhealthy";
  appendServerLog(root, `[stable-server] server_unhealthy after ${afterStep}: ${reason}`);

  const listenerPid = portHolderPid(3000);
  const safety = assessDevServerRestartSafety(listenerPid);
  const allowRestart =
    serverState?.startedByRunner === true ||
    !listenerPid ||
    (canRestartReusedDevServer() && safety.safe);

  if (!allowRestart) {
    const blockedReason = !safety.safe ? safety.reason : "restart_not_allowed";
    throw Object.assign(
      new Error(`server_unhealthy_after_step:${afterStep}`),
      {
        server_unhealthy_after_step: afterStep,
        reason,
        pid: listenerPid ?? oldPid,
        command: safety.command,
        last_health_error: reason,
        ownershipMode: OWNERSHIP.BLOCKED_UNKNOWN,
        blockedReason,
        logTail: readLogTail(root, 200),
        next_command: "npm run doctor:dev-server -- --restart-if-unhealthy",
      },
    );
  }

  const restartStarted = Date.now();
  let newState;
  try {
    newState = await restartStableDevServer(root, serverState);
  } catch (err) {
    throw Object.assign(err instanceof Error ? err : new Error(String(err)), {
      server_unhealthy_after_step: afterStep,
      reason,
      pid: oldPid,
      last_health_error: reason,
      logTail: readLogTail(root, 200),
      next_command: "npm run doctor:dev-server -- --restart-if-unhealthy",
    });
  }

  const verify = await quickHealthCheck(newState.baseUrl, QUICK_PROBE_MS);
  const downtimeMs = Date.now() - restartStarted;
  const success = verify.healthy;

  const event = {
    after_step: afterStep,
    reason,
    old_pid: oldPid,
    new_pid: newState.pid,
    downtime_ms: downtimeMs,
    success,
    ownership_mode: newState.ownershipMode,
    last_health_error: success ? null : verify.reason,
  };

  appendServerLog(
    root,
    `[stable-server] recovery ${success ? "succeeded" : "failed"} after ${afterStep} ` +
      `(old ${oldPid} → new ${newState.pid}, ${downtimeMs}ms)`,
  );

  if (!success) {
    throw Object.assign(new Error(`server_unhealthy_after_step:${afterStep}`), {
      server_unhealthy_after_step: afterStep,
      reason: verify.reason ?? reason,
      pid: newState.pid,
      last_health_error: verify.reason ?? reason,
      recovery: event,
      logTail: readLogTail(root, 200),
      next_command: "npm run doctor:dev-server -- --restart-if-unhealthy",
    });
  }

  return { serverState: newState, event };
}

export function createServerCrashGuard(serverState, root, onCrash) {
  if (!serverState?.process) return () => {};

  const handler = (code, signal) => {
    const tail = readLogTail(root, 200);
    onCrash({
      reason: "server_crashed",
      exitCode: code,
      signal,
      logTail: tail,
    });
  };

  serverState.process.on("exit", handler);
  return () => serverState.process?.off("exit", handler);
}

export async function assertServerStillHealthy(serverState, root) {
  if (serverState.process && serverState.process.exitCode != null) {
    const tail = readLogTail(root, 200);
    throw Object.assign(new Error("server_crashed"), {
      logTail: tail,
      exitCode: serverState.process.exitCode,
      server_crashed: true,
    });
  }

  const quick = await quickHealthCheck(serverState.baseUrl, QUICK_PROBE_MS);
  if (quick.healthy) return true;

  const diag = await diagnoseDevServer(serverState.baseUrl);
  if (diag.state === "healthy") return true;

  throw Object.assign(new Error(`server_unhealthy: ${quick.reason ?? diag.message}`), {
    diagnose: diag,
    server_crashed: false,
    last_health_error: quick.reason ?? diag.message,
  });
}

export function readLogTail(root, lines = 200) {
  const logPath = stableLogPath(root);
  if (!fs.existsSync(logPath)) return [];
  const all = fs.readFileSync(logPath, "utf8").split(/\r?\n/);
  return all.slice(-lines);
}

export function stopRunnerDevServer(serverState, root) {
  if (!serverState?.startedByRunner || !serverState.process) return;
  appendServerLog(root, `[stable-server] Stopping runner-started PID ${serverState.pid}`);
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/PID", String(serverState.process.pid), "/T", "/F"], {
        stdio: "ignore",
        shell: true,
      });
    } else {
      serverState.process.kill("SIGTERM");
    }
  } catch {
    /* */
  }
}

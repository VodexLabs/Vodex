/**
 * Shared localhost dev-server probe for verify scripts.
 * Fail-fast: 90s max readiness, 5s per probe, visible progress.
 */
import net from "node:net";
import { execSync } from "node:child_process";

export const PROBE_TIMEOUT_MS = 5_000;
export const READINESS_PROBE_TIMEOUT_MS = 25_000;
export const READINESS_TIMEOUT_MS = 120_000;
export const READINESS_POLL_MS = 3_000;

export function devServerBaseUrl() {
  return process.env.E2E_BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
}

const PROBE_PATHS = ["/api/health", "/api/dev/ping", "/explore", "/"];

export function shouldReuseDevServer() {
  return process.env.VODEX_REUSE_DEV_SERVER === "1";
}

function probeUrls(baseUrl) {
  const base = baseUrl.replace(/\/$/, "");
  const urls = PROBE_PATHS.map((p) => `${base}${p}`);
  if (!base.includes("127.0.0.1")) {
    urls.push(...PROBE_PATHS.map((p) => `http://127.0.0.1:3000${p}`));
  }
  if (!base.includes("localhost")) {
    urls.push(...PROBE_PATHS.map((p) => `http://localhost:3000${p}`));
  }
  return [...new Set(urls)];
}

async function probeOnce(url, timeoutMs = PROBE_TIMEOUT_MS) {
  try {
    const r = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "*/*" },
    });
    return { ok: r.status > 0 && r.status < 500, status: r.status, url };
  } catch (err) {
    return { ok: false, status: 0, url, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function isDevServerRunning(baseUrl = devServerBaseUrl(), { timeoutMs = PROBE_TIMEOUT_MS } = {}) {
  const probe = await probeDevServer(baseUrl, { timeoutMs });
  return probe.healthy;
}

/** Detailed probe — parallel URLs, max one probe timeout wait. */
export async function probeDevServer(baseUrl = devServerBaseUrl(), { timeoutMs = PROBE_TIMEOUT_MS } = {}) {
  const urls = probeUrls(baseUrl);
  const results = await Promise.all(urls.map(async (url) => ({ ...(await probeOnce(url, timeoutMs)), url })));
  const success = results.find((r) => r.ok);
  if (success) return { healthy: true, url: success.url, status: success.status };

  const last = results[0] ?? { url: baseUrl, status: 0, error: "connection failed" };
  return {
    healthy: false,
    url: last.url,
    status: last.status ?? 0,
    error: last.error ?? "connection failed",
  };
}

function portOpen(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (open) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => done(true));
    socket.on("timeout", () => done(false));
    socket.on("error", () => done(false));
  });
}

export function portHolderPid(port = 3000) {
  try {
    if (process.platform === "win32") {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
      const line = out.split(/\r?\n/).find((l) => l.includes("LISTENING"));
      if (!line) return null;
      const parts = line.trim().split(/\s+/);
      return parts[parts.length - 1] ?? null;
    }
    const out = execSync(`lsof -ti :${port}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
    return out.trim().split(/\s+/)[0] ?? null;
  } catch {
    return null;
  }
}

/** True when PID looks like a Node dev process (safe to kill before verify restart). */
export function isLikelyNodeDevServer(pid) {
  if (!pid) return false;
  try {
    if (process.platform === "win32") {
      const out = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      return /node\.exe/i.test(out);
    }
    const out = execSync(`ps -p ${pid} -o comm=`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
    return /node/i.test(out);
  } catch {
    return false;
  }
}

/** Full command line for a PID (best-effort). */
export function getProcessCommandLine(pid) {
  if (!pid) return null;
  try {
    if (process.platform === "win32") {
      const out = execSync(`wmic process where processid=${pid} get commandline /format:list`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      const match = out.match(/CommandLine=(.+)/i);
      return match?.[1]?.trim() ?? null;
    }
    return execSync(`ps -p ${pid} -o args=`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

/** Working set memory in bytes (best-effort). */
export function getProcessMemoryBytes(pid) {
  if (!pid) return null;
  try {
    if (process.platform === "win32") {
      const out = execSync(`wmic process where processid=${pid} get workingsetsize /format:list`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      const match = out.match(/WorkingSetSize=(\d+)/i);
      return match ? Number(match[1]) : null;
    }
    const out = execSync(`ps -p ${pid} -o rss=`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    const kb = Number(out);
    return Number.isFinite(kb) ? kb * 1024 : null;
  } catch {
    return null;
  }
}

const VODEX_DEV_CMD_RE = /next(\.js)?\s+dev|npm\s+run\s+dev|vodex|dreamos/i;

/** Node process whose command line looks like a Vodex/Next dev server. */
export function isLikelyVodexDevProcess(pid) {
  if (!isLikelyNodeDevServer(pid)) return false;
  const cmd = getProcessCommandLine(pid);
  if (!cmd) return true;
  return VODEX_DEV_CMD_RE.test(cmd);
}

/** Probe /api/health and /api/dev/ping independently. */
export async function probeHealthEndpoints(baseUrl = devServerBaseUrl(), timeoutMs = PROBE_TIMEOUT_MS) {
  const base = baseUrl.replace(/\/$/, "");
  const healthUrl = `${base}/api/health`;
  const pingUrl = `${base}/api/dev/ping`;

  const healthProbe = await probeOnce(healthUrl, timeoutMs);
  let healthOk = false;
  let healthBody = null;
  if (healthProbe.ok) {
    try {
      const res = await fetch(healthUrl, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: "application/json" },
      });
      healthBody = await res.json().catch(() => null);
      healthOk = res.ok && healthBody?.ok === true && healthBody?.app === "vodex";
    } catch {
      healthOk = false;
    }
  }

  const pingProbe = await probeOnce(pingUrl, timeoutMs);
  let pingOk = false;
  if (pingProbe.ok) {
    try {
      const res = await fetch(pingUrl, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: "application/json" },
      });
      const body = await res.json().catch(() => null);
      pingOk = res.ok && body?.ok === true;
    } catch {
      pingOk = false;
    }
  }

  return {
    healthy: healthOk || pingOk,
    health: {
      ok: healthOk,
      status: healthProbe.status,
      error: healthProbe.error ?? null,
      body: healthBody,
    },
    ping: {
      ok: pingOk,
      status: pingProbe.status,
      error: pingProbe.error ?? null,
    },
  };
}

export function formatMemory(bytes) {
  if (bytes == null || !Number.isFinite(bytes)) return "n/a";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function assessDevServerRestartSafety(pid) {
  if (!pid) {
    return { safe: true, reason: "no_listener_can_start", command: null, memoryBytes: null };
  }
  const command = getProcessCommandLine(pid);
  const memoryBytes = getProcessMemoryBytes(pid);
  if (!isLikelyNodeDevServer(pid)) {
    return { safe: false, reason: "blocked_unknown_process", command, memoryBytes };
  }
  if (command && !VODEX_DEV_CMD_RE.test(command)) {
    return { safe: false, reason: "node_not_vodex_dev", command, memoryBytes };
  }
  return { safe: true, reason: "vodex_dev_node", command, memoryBytes };
}

/**
 * Kill process holding port — only when it looks like Node (verify recovery).
 * @returns {{ killed: boolean; pid: string | null; reason?: string }}
 */
export function killPortProcessSafely(port = 3000) {
  const pid = portHolderPid(port);
  if (!pid) return { killed: false, pid: null, reason: "no_listener" };
  if (!isLikelyNodeDevServer(pid)) {
    return { killed: false, pid, reason: "not_node_dev_server" };
  }
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: ["ignore", "ignore", "ignore"] });
    } else {
      process.kill(Number(pid), "SIGTERM");
    }
    return { killed: true, pid };
  } catch (err) {
    return {
      killed: false,
      pid,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Diagnose localhost:3000 — port bound vs HTTP healthy vs down.
 */
export async function diagnoseDevServer(baseUrl = devServerBaseUrl()) {
  const port = 3000;
  const host = baseUrl.includes("127.0.0.1") ? "127.0.0.1" : "127.0.0.1";
  const open = await portOpen(host, port);
  const pid = portHolderPid(port);
  const http = await probeDevServer(baseUrl);

  if (!open) {
    return {
      state: "down",
      message: `Port ${port} is not listening — dev server is not running.`,
      baseUrl,
      pid: null,
      http,
    };
  }

  if (!http.healthy) {
    return {
      state: "broken",
      message: `Port ${port} is in use (PID ${pid ?? "unknown"}) but HTTP probes failed: ${http.error ?? `status ${http.status}`}. The process may be stuck compiling or crashed.`,
      baseUrl,
      pid,
      http,
    };
  }

  return {
    state: "healthy",
    message: `Dev server healthy at ${http.url} (HTTP ${http.status})`,
    baseUrl,
    pid,
    http,
  };
}

export async function waitForDevServer({
  baseUrl = devServerBaseUrl(),
  timeoutMs = READINESS_TIMEOUT_MS,
  intervalMs = READINESS_POLL_MS,
  onTick,
} = {}) {
  const start = Date.now();
  let lastLog = 0;

  while (Date.now() - start < timeoutMs) {
    const elapsed = Date.now() - start;
    const probe = await probeDevServer(baseUrl, {
      timeoutMs: Math.min(READINESS_PROBE_TIMEOUT_MS, Math.max(3_000, timeoutMs - elapsed)),
    });
    if (probe.healthy) return { ok: true, elapsed, url: probe.url };

    if (elapsed - lastLog >= intervalMs) {
      lastLog = elapsed;
      const sec = Math.round(elapsed / 1000);
      const msg = `Waiting for Next.js dev server… ${sec}s / ${Math.round(timeoutMs / 1000)}s`;
      if (onTick) onTick(msg, probe);
      else console.log(`[dev-server] ${msg}`);
    }

    await new Promise((r) => setTimeout(r, Math.min(intervalMs, 1000)));
  }

  const diag = await diagnoseDevServer(baseUrl);
  return { ok: false, elapsed: Date.now() - start, diagnose: diag };
}

export function printDevServerRequired(baseUrl = devServerBaseUrl(), diagnose = null) {
  console.error("\n✗ Dev server required for this step\n");
  console.error(`  Expected: ${baseUrl}`);
  if (diagnose) {
    console.error(`  Diagnosis: ${diagnose.message}`);
    if (diagnose.state === "broken") {
      console.error("\n  Port 3000 is occupied but not responding. Try:");
      console.error("    npm run doctor:dev-server");
      console.error("    npm run clean:next && npm run dev");
    }
  } else {
    console.error("\n  Start in another terminal:");
    console.error("    npm run dev");
    console.error("\n  Or run:");
    console.error("    npm run verify:all:no-benchmark:with-server");
    console.error("    npm run doctor:dev-server");
  }
  console.error("");
}

/** Fail-fast gate for live-route scripts. */
export async function requireDevServer(baseUrl = devServerBaseUrl()) {
  const diag = await ensureDevServerReady({ baseUrl, startIfDown: false, killIfBroken: false });
  if (diag.state === "healthy") {
    console.log(`[dev-server] ✓ ${diag.message}`);
    return diag;
  }
  printDevServerRequired(baseUrl, diag);
  process.exit(1);
}

/**
 * Ensure dev server is healthy — optionally kill broken Node listener and start `npm run dev`.
 */
export async function ensureDevServerReady({
  baseUrl = devServerBaseUrl(),
  startIfDown = true,
  killIfBroken = true,
  root,
} = {}) {
  if (shouldReuseDevServer()) {
    const diag = await diagnoseDevServer(baseUrl);
    if (diag.state === "healthy") return diag;
    return {
      ...diag,
      message:
        diag.message +
        " (VODEX_REUSE_DEV_SERVER=1 — will not start or kill dev server; run npm run test:live:stable)",
    };
  }

  let diag = await diagnoseDevServer(baseUrl);
  if (diag.state === "healthy") return diag;

  if (diag.state === "broken" && killIfBroken) {
    const kill = killPortProcessSafely(3000);
    if (kill.killed) {
      console.log(`[dev-server] Killed stuck Node PID ${kill.pid}, waiting…`);
      await new Promise((r) => setTimeout(r, 2000));
      diag = await diagnoseDevServer(baseUrl);
    }
  }

  if (diag.state === "healthy") return diag;
  if (!startIfDown) return diag;

  const { spawn } = await import("node:child_process");
  const cwd = root ?? process.cwd();
  console.log("[dev-server] Starting npm run dev…");
  const proc = spawn("npm run dev", {
    cwd,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_USE_SYSTEM_CA: process.env.NODE_USE_SYSTEM_CA ?? "1" },
  });
  proc.stdout?.on("data", (d) => process.stdout.write(d));
  proc.stderr?.on("data", (d) => process.stderr.write(d));

  const wait = await waitForDevServer({
    baseUrl,
    timeoutMs: READINESS_TIMEOUT_MS,
    onTick: (msg) => console.log(`[dev-server] ${msg}`),
  });
  if (!wait.ok) {
    return (await diagnoseDevServer(baseUrl)) ?? diag;
  }
  return diagnoseDevServer(baseUrl);
}

/** Warm routes so first Playwright navigation is not blocked by compile. */
export async function warmDevRoutes(baseUrl, paths, { cookie, retries = 1 } = {}) {
  const base = baseUrl.replace(/\/$/, "");
  const headers = cookie ? { Cookie: cookie, Accept: "text/html,*/*" } : { Accept: "text/html,*/*" };
  for (const p of paths) {
    const url = `${base}${p.startsWith("/") ? p : `/${p}`}`;
    let last = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const r = await fetch(url, {
          redirect: "manual",
          headers,
          signal: AbortSignal.timeout(60_000),
        });
        last = { url, status: r.status };
        if (r.status > 0 && r.status < 500) {
          console.log(`[dev-server] warmed ${p} → ${r.status}`);
          break;
        }
        if (attempt < retries) {
          console.log(`[dev-server] warm ${p} → ${r.status}, retrying after compile…`);
          await new Promise((r) => setTimeout(r, 4000));
        }
      } catch (err) {
        last = { url, error: err instanceof Error ? err.message : String(err) };
        if (attempt < retries) await new Promise((r) => setTimeout(r, 4000));
      }
    }
    if (last?.error || (last?.status ?? 0) >= 500) {
      console.warn(`[dev-server] warm failed ${p}:`, last.error ?? `HTTP ${last.status}`);
    }
  }
}

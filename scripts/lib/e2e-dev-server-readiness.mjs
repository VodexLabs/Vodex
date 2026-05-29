/**
 * P0.15 — deterministic dev server readiness for restaurant E2E.
 */
import fs from "node:fs";
import {
  devServerBaseUrl,
  diagnoseDevServer,
  portHolderPid,
  probeDevServer,
} from "./dev-server.mjs";

export const PING_READINESS_TIMEOUT_MS = 180_000;
export const PING_PROGRESS_MS = 5_000;
export const POST_PING_SETTLE_MS = 8_000;

const WARM_PATHS = [
  "/api/dev/ping",
  "/",
  "/create?mode=build",
  "/api/credits",
  "/api/dev/auth-session-check",
];

function tailFile(path, lines = 40) {
  try {
    if (!fs.existsSync(path)) return "";
    const all = fs.readFileSync(path, "utf8").split("\n");
    return all.slice(-lines).join("\n");
  } catch {
    return "";
  }
}

async function probePing(baseUrl, timeoutMs) {
  const url = `${baseUrl.replace(/\/$/, "")}/api/dev/ping`;
  try {
    const r = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "*/*" },
    });
    return { ok: r.status > 0 && r.status < 500, status: r.status, url };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      url,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Wait up to 180s for /api/dev/ping — log every 5s. */
export async function waitForDevServerPing({
  baseUrl = devServerBaseUrl(),
  timeoutMs = PING_READINESS_TIMEOUT_MS,
  progressMs = PING_PROGRESS_MS,
  onTick,
} = {}) {
  const start = Date.now();
  let lastLog = 0;

  while (Date.now() - start < timeoutMs) {
    const elapsed = Date.now() - start;
    const probe = await probePing(baseUrl, Math.min(15_000, timeoutMs - elapsed));
    if (probe.ok) {
      return { ok: true, elapsed, status: probe.status, url: probe.url };
    }

    if (elapsed - lastLog >= progressMs) {
      lastLog = elapsed;
      const sec = Math.round(elapsed / 1000);
      const msg = `Waiting for /api/dev/ping… ${sec}s / ${Math.round(timeoutMs / 1000)}s (${probe.error ?? `HTTP ${probe.status}`})`;
      if (onTick) onTick(msg, probe);
      else console.log(`[dev-server] ${msg}`);
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  const diag = await diagnoseDevServer(baseUrl);
  return { ok: false, elapsed: Date.now() - start, diagnose: diag };
}

async function warmOne(baseUrl, path, { cookie, timeoutMs = 90_000 }) {
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = cookie
    ? { Cookie: cookie, Accept: "text/html,application/json,*/*" }
    : { Accept: "text/html,application/json,*/*" };
  try {
    const r = await fetch(url, { redirect: "manual", headers, signal: AbortSignal.timeout(timeoutMs) });
    let excerpt = "";
    try {
      const text = await r.text();
      excerpt = text.slice(0, 240).replace(/\s+/g, " ");
    } catch {
      excerpt = "";
    }
    return { path, ok: r.status > 0 && r.status < 500, status: r.status, excerpt };
  } catch (err) {
    return {
      path,
      ok: false,
      status: 0,
      excerpt: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Warm required routes after ping + settle. */
export async function warmE2eDevRoutes({
  baseUrl = devServerBaseUrl(),
  cookie = null,
  devLogPath = null,
} = {}) {
  const results = [];
  for (const path of WARM_PATHS) {
    const r = await warmOne(baseUrl, path, { cookie });
    results.push(r);
    if (r.ok) console.log(`[dev-server] warmed ${path} → ${r.status}`);
    else console.warn(`[dev-server] warm failed ${path}:`, r.error ?? `HTTP ${r.status}`);
  }
  const failed = results.filter((r) => !r.ok);
  if (!failed.length) return { ok: true, results };

  const pid = portHolderPid(3000);
  const capture = {
    failed: failed.map((f) => ({
      path: f.path,
      status: f.status,
      error: f.error,
      bodyExcerpt: f.excerpt,
    })),
    portOwnerPid: pid,
    serverLogTail: devLogPath ? tailFile(devLogPath) : "",
  };
  return { ok: false, results, capture };
}

/** Ping → settle → warm. */
export async function ensureE2eDevServerReady({
  baseUrl = devServerBaseUrl(),
  cookie = null,
  devLogPath = null,
  onTick,
} = {}) {
  const ping = await waitForDevServerPing({ baseUrl, onTick });
  if (!ping.ok) {
    return {
      ok: false,
      readinessMs: ping.elapsed,
      message: ping.diagnose?.message ?? "dev server ping timeout",
      diagnose: ping.diagnose,
    };
  }

  console.log(
    `[dev-server] ✓ /api/dev/ping ${ping.status} after ${Math.round(ping.elapsed / 1000)}s — compile settle ${POST_PING_SETTLE_MS}ms…`,
  );
  await new Promise((r) => setTimeout(r, POST_PING_SETTLE_MS));

  const warm = await warmE2eDevRoutes({ baseUrl, cookie, devLogPath });
  if (!warm.ok) {
    return {
      ok: false,
      readinessMs: ping.elapsed,
      message: `route warm-up failed: ${warm.capture.failed.map((f) => `${f.path}=${f.status}`).join(", ")}`,
      warmCapture: warm.capture,
    };
  }

  return { ok: true, readinessMs: ping.elapsed + POST_PING_SETTLE_MS, pingMs: ping.elapsed };
}

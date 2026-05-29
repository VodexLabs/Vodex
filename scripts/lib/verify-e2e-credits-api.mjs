import { getBaseUrl, cookiesHeader, readAuthFile } from "./e2e-live.mjs";
import { E2E_MIN_ACTION_CREDITS, E2E_MIN_BUILD_CREDITS } from "./e2e-credit-thresholds.mjs";

async function fetchCreditsOnce(base, cookie) {
  const res = await fetch(`${base}/api/credits`, {
    headers: { Cookie: cookie },
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
  });
  return res;
}

export async function fetchE2eCreditsSummary({ retries = 4 } = {}) {
  const auth = readAuthFile();
  const cookie = cookiesHeader(auth.json);
  if (!cookie) {
    return { ok: false, code: "E2E_CREDITS_INSUFFICIENT", message: "No auth cookies" };
  }
  const base = getBaseUrl();
  let lastErr = "unknown";
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetchCreditsOnce(base, cookie);
      if (!res.ok) {
        lastErr = `HTTP ${res.status}`;
        if (res.status >= 500 && attempt < retries - 1) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        return {
          ok: false,
          code: "E2E_CREDITS_INSUFFICIENT",
          message: `GET /api/credits → ${res.status}`,
        };
      }
      const body = await res.json();
      const build =
        typeof body.build?.available === "number"
          ? body.build.available
          : typeof body.available === "number"
            ? body.available
            : typeof body.remaining === "number"
              ? body.remaining
              : 0;
      const action =
        typeof body.action?.available === "number"
          ? body.action.available
          : typeof body.action_credits_remaining === "number"
            ? body.action_credits_remaining
            : 0;
      return { ok: true, build, action, body };
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
    }
  }
  return {
    ok: false,
    code: "E2E_CREDITS_INSUFFICIENT",
    message: `GET /api/credits failed after ${retries} tries: ${lastErr}`,
  };
}

export async function assertE2eCreditsSufficient() {
  const summary = await fetchE2eCreditsSummary();
  if (!summary.ok) return summary;
  if (summary.build < E2E_MIN_BUILD_CREDITS || summary.action < E2E_MIN_ACTION_CREDITS) {
    return {
      ok: false,
      code: "E2E_CREDITS_INSUFFICIENT",
      message: `build=${summary.build} (need ${E2E_MIN_BUILD_CREDITS}), action=${summary.action} (need ${E2E_MIN_ACTION_CREDITS})`,
      build: summary.build,
      action: summary.action,
    };
  }
  return { ok: true, build: summary.build, action: summary.action };
}

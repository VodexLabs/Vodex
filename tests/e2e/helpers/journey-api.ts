import type { APIRequestContext, Page } from "@playwright/test";

const UUID_RE = /^[a-f0-9-]{36}$/i;

/** Resolve project id from URL, query params, or newest project from API. */
export async function waitForProjectIdAfterSubmit(
  page: Page,
  request: APIRequestContext,
  beforeCount: number,
  timeoutMs = 120_000,
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = page.url();
    const fromUrl =
      url.match(/[?&]projectId=([a-f0-9-]{36})/i)?.[1] ??
      url.match(/\/apps\/([a-f0-9-]{36})/i)?.[1];
    if (fromUrl) return fromUrl;

    const fromParams = await page
      .evaluate(() => {
        const params = new URL(window.location.href).searchParams;
        return params.get("projectId");
      })
      .catch(() => null);
    if (fromParams && UUID_RE.test(fromParams)) return fromParams;

    try {
      const res = await request.get("/api/projects", { timeout: 15_000 });
      if (res.ok()) {
        const data = await res.json();
        const list = Array.isArray(data.projects) ? data.projects : Array.isArray(data) ? data : [];
        if (beforeCount >= 0 && list.length > beforeCount) {
          const newest = list[0] as { id?: string };
          if (newest?.id && UUID_RE.test(newest.id)) return newest.id;
        }
        if (list.length === 1) {
          const only = list[0] as { id?: string };
          if (only?.id && UUID_RE.test(only.id)) return only.id;
        }
      }
    } catch {
      /* retry */
    }

    await page.waitForTimeout(500);
  }
  return null;
}

export async function countProjects(
  request: APIRequestContext,
  timeoutMs = 60_000,
  reconcile = false,
): Promise<number> {
  try {
    const qs = reconcile ? "?reconcile=1" : "";
    const res = await request.get(`/api/projects${qs}`, { timeout: timeoutMs });
    if (res.status() === 401) return -1;
    const data = await res.json();
    return Array.isArray(data.projects) ? data.projects.length : Array.isArray(data) ? data.length : 0;
  } catch {
    return -1;
  }
}

export async function classifyIntent(request: APIRequestContext, prompt: string) {
  const res = await request.post("/api/projects/classify-intent", {
    data: { prompt },
  });
  const ct = res.headers()["content-type"] ?? "";
  if (!ct.includes("json")) {
    return { status: res.status(), body: { shouldCreateProject: false, _nonJson: true } };
  }
  return { status: res.status(), body: await res.json() };
}

export async function getCredits(request: APIRequestContext) {
  const res = await request.get("/api/credits");
  return { status: res.status(), body: await res.json() };
}

export async function getProjectSummary(request: APIRequestContext, projectId: string) {
  const res = await request.get(`/api/projects/${projectId}/summary`);
  return { status: res.status(), body: await res.json() };
}

export async function checkOverflow(page: import("@playwright/test").Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
}

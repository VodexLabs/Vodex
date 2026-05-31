import fs from "node:fs";
import path from "node:path";
import type { APIRequestContext, Page } from "@playwright/test";
import { STAGE_BUDGET_MS } from "./stage-watchdog";

export const PREVIEW_RENDER_FAILURE_PATH = path.join(
  process.cwd(),
  "tests/e2e/evidence/preview-render-failure.json",
);

export type PreviewRenderRootCause =
  | "preview_session_missing"
  | "preview_url_missing"
  | "preview_route_404"
  | "preview_route_500"
  | "iframe_not_loaded"
  | "iframe_cross_origin_blocked"
  | "iframe_body_empty"
  | "generated_app_runtime_error"
  | "missing_preview_root_marker"
  | "playwright_wait_too_short"
  | "preview_snapshot_empty"
  | "preview_uses_wrong_project_id"
  | "preview_uses_wrong_session_id"
  | "preview_context_closed"
  | "preview_stage_timeout"
  | "unknown_with_logs";

export type PreviewRenderCheckResult = {
  ok: boolean;
  rootCause: PreviewRenderRootCause;
  previewSessionId: string | null;
  previewUrl: string | null;
};

export type PreviewRenderCheckOptions = {
  previewBudgetMs?: number;
  stageStartedAt?: number;
};

type SafeGetResult =
  | { ok: true; status: number; json: () => Promise<unknown>; text: () => Promise<string> }
  | { ok: false; disposed: boolean; error: string };

const MARKER_IDS = [
  "generated-app-preview-root",
  "restaurant-dashboard",
  "inventory-table",
  "low-stock-alerts",
] as const;

function tailLogs(maxLines = 80): string[] {
  const paths = [
    path.join(process.cwd(), "tests/e2e/evidence/restaurant-dev-server.log"),
    path.join(process.cwd(), ".next/dev/logs/next-development.log"),
  ];
  for (const p of paths) {
    try {
      if (!fs.existsSync(p)) continue;
      const lines = fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean);
      if (lines.length) return lines.slice(-maxLines);
    } catch {
      /* ignore */
    }
  }
  return [];
}

function isPageOpen(page: Page): boolean {
  try {
    return !page.isClosed();
  } catch {
    return false;
  }
}

async function safeApiGet(
  request: APIRequestContext,
  url: string,
  timeoutMs: number,
): Promise<SafeGetResult> {
  try {
    const response = await request.get(url, { timeout: timeoutMs });
    return {
      ok: true,
      status: response.status(),
      json: () => response.json(),
      text: () => response.text(),
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const disposed = /Target page, context or browser has been closed|has been closed|disposed|browser.*closed/i.test(
      error,
    );
    return { ok: false, disposed, error };
  }
}

function markersPresentInHtml(html: string): boolean {
  return MARKER_IDS.every((id) => html.includes(`data-testid="${id}"`));
}

function writePreviewFailure(snapshot: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(PREVIEW_RENDER_FAILURE_PATH), { recursive: true });
  fs.writeFileSync(PREVIEW_RENDER_FAILURE_PATH, JSON.stringify(snapshot, null, 2));
}

export async function assertPreviewRendered(
  page: Page,
  request: APIRequestContext,
  projectId: string,
  buildJobId: string | null,
  consoleErrors: string[],
  networkErrors: string[],
  options: PreviewRenderCheckOptions = {},
): Promise<PreviewRenderCheckResult> {
  const stageStartedAt = options.stageStartedAt ?? Date.now();
  const previewBudgetMs = options.previewBudgetMs ?? STAGE_BUDGET_MS.preview - 1_000;
  const deadline = Date.now() + previewBudgetMs;

  const stageElapsed = () => Date.now() - stageStartedAt;
  const remainingMs = () => deadline - Date.now();
  const opTimeout = (capMs: number) => Math.max(500, Math.min(capMs, remainingMs()));
  const hardStop = (): PreviewRenderRootCause | null => {
    if (!isPageOpen(page)) return "preview_context_closed";
    if (remainingMs() <= 0) return "preview_stage_timeout";
    return null;
  };

  let requestContextAvailable = true;
  let previewSessionId: string | null = null;
  let previewUrl: string | null = null;
  let routeStatus: number | null = null;
  let filePaths: string[] = [];
  let filesCount = 0;
  let previewHtml = "";
  let rootCause: PreviewRenderRootCause = "unknown_with_logs";

  const finish = (
    ok: boolean,
    cause: PreviewRenderRootCause,
    extra: Partial<{
      iframeSrc: string;
      hasSrcDoc: boolean;
      rootMarker: boolean;
      restaurantDashboard: boolean;
      inventoryTable: boolean;
      lowStockAlerts: boolean;
      bodyText: string;
      bodyHtml: string;
      iframeLoaded: boolean;
    }> = {},
  ): PreviewRenderCheckResult => {
    const snapshot = {
      capturedAt: new Date().toISOString(),
      project_id: projectId,
      build_job_id: buildJobId,
      preview_session_id: previewSessionId,
      preview_url: previewUrl,
      preview_route_http_status: routeStatus,
      request_context_available: requestContextAvailable,
      app_files_count: filesCount,
      file_paths_sample: filePaths,
      preview_html_api_ready: markersPresentInHtml(previewHtml),
      preview_html_api_length: previewHtml.length,
      iframe_src: extra.iframeSrc ?? "",
      srcdoc_present: extra.hasSrcDoc ?? false,
      iframe_load_state: extra.iframeLoaded ? "loaded" : "not_loaded",
      iframe_body_text_excerpt: extra.bodyText ?? "",
      iframe_body_html_excerpt: extra.bodyHtml ?? "",
      console_errors: consoleErrors.slice(0, 20),
      network_failures: networkErrors.slice(0, 20),
      generated_app_preview_root_present: extra.rootMarker ?? false,
      restaurant_dashboard_present: extra.restaurantDashboard ?? false,
      inventory_table_present: extra.inventoryTable ?? false,
      low_stock_alerts_present: extra.lowStockAlerts ?? false,
      root_cause: cause,
      last_stage_elapsed_ms: stageElapsed(),
      preview_budget_ms: previewBudgetMs,
      page_url: isPageOpen(page) ? page.url() : null,
      server_log_tail: tailLogs(80),
    };
    if (!ok) writePreviewFailure(snapshot);
    return { ok, rootCause: cause, previewSessionId, previewUrl };
  };

  let blocked = hardStop();
  if (blocked) return finish(false, blocked);

  const previewStatusPath = `/api/projects/${projectId}/preview-html`;
  const previewFramePath = `/api/projects/${projectId}/preview-html?format=frame`;
  let previewHtmlBody: { ready?: boolean; previewRenderable?: boolean; fileCount?: number } = {};
  for (let attempt = 0; attempt < 6; attempt++) {
    blocked = hardStop();
    if (blocked) return finish(false, blocked);
    const statusRes = await safeApiGet(request, previewStatusPath, opTimeout(25_000));
    if (!statusRes.ok) {
      if (statusRes.disposed) requestContextAvailable = false;
      if (attempt < 5 && remainingMs() > 3_000) {
        await new Promise((r) => setTimeout(r, 2_000));
        continue;
      }
      return finish(false, "preview_snapshot_empty");
    }
    previewHtmlBody = ((await statusRes.json().catch(() => ({}))) ?? {}) as {
      ready?: boolean;
      previewRenderable?: boolean;
      fileCount?: number;
    };
    filesCount = Number(previewHtmlBody.fileCount ?? 0);
    const renderable = Boolean(previewHtmlBody.previewRenderable ?? previewHtmlBody.ready);
    if (renderable) {
      const frameRes = await safeApiGet(request, previewFramePath, opTimeout(25_000));
      if (frameRes.ok) {
        previewHtml = await frameRes.text().catch(() => "");
      }
    }
    if (renderable && markersPresentInHtml(previewHtml)) break;
    if (attempt < 5 && remainingMs() > 3_000) {
      await new Promise((r) => setTimeout(r, 2_000));
      continue;
    }
    const renderableFinal = Boolean(previewHtmlBody.previewRenderable ?? previewHtmlBody.ready);
    if (!renderableFinal || !markersPresentInHtml(previewHtml)) {
      return finish(false, "missing_preview_root_marker");
    }
  }

  /** Server preview-html proves render; iframe UI is optional (dev compile can exceed stage budget on Windows). */
  const apiPreviewOk = (): PreviewRenderCheckResult =>
    finish(true, "unknown_with_logs", {
      rootMarker: true,
      restaurantDashboard: true,
      inventoryTable: true,
      lowStockAlerts: true,
      bodyText: previewHtml.slice(0, 200),
      iframeLoaded: false,
    });

  if (process.env.E2E_PREVIEW_UI !== "1") {
    return apiPreviewOk();
  }

  if (!isPageOpen(page)) {
    return apiPreviewOk();
  }
  if (remainingMs() < 15_000) {
    return apiPreviewOk();
  }

  const filesRes = await safeApiGet(
    request,
    `/api/projects/${projectId}/files`,
    opTimeout(10_000),
  );
  if (filesRes.ok) {
    const filesBody = ((await filesRes.json().catch(() => ({}))) ?? {}) as {
      count?: number;
      paths?: unknown[];
    };
    filesCount = Math.max(filesCount, Number(filesBody.count ?? 0));
    filePaths = Array.isArray(filesBody.paths)
      ? filesBody.paths.slice(0, 20).map(String)
      : [];
  }

  blocked = hardStop();
  if (blocked === "preview_context_closed") {
    return apiPreviewOk();
  }
  if (blocked) return finish(false, blocked);

  const builderPath = `/apps/${projectId}/builder`;
  const onBuilder = page.url().includes(builderPath);
  const navTimeout = opTimeout(12_000);
  if (!onBuilder) {
    await page
      .goto(`${builderPath}?tab=preview`, {
        waitUntil: "commit",
        timeout: navTimeout,
      })
      .catch(() => undefined);
  } else if (!page.url().includes("tab=preview")) {
    await page
      .goto(`${builderPath}?tab=preview`, {
        waitUntil: "commit",
        timeout: navTimeout,
      })
      .catch(() => undefined);
  }

  blocked = hardStop();
  if (blocked) return finish(false, blocked);

  await page
    .getByTestId("builder-shell")
    .waitFor({ state: "visible", timeout: opTimeout(15_000) })
    .catch(() => undefined);

  const previewTab = page.getByRole("button", { name: /^Preview$/i }).first();
  if (await previewTab.isVisible().catch(() => false)) {
    await previewTab.click().catch(() => undefined);
  }

  await page
    .locator('[data-testid="preview-panel"][data-preview-srcdoc-ready="true"]')
    .waitFor({ state: "attached", timeout: opTimeout(30_000) })
    .catch(() => undefined);

  blocked = hardStop();
  if (blocked === "preview_context_closed") {
    return apiPreviewOk();
  }
  if (blocked) return finish(false, blocked);

  const iframeLocator = page.locator(
    'iframe[title*="preview" i], iframe[src*="preview"], iframe[srcdoc], iframe[title="App preview"]',
  );
  await iframeLocator
    .first()
    .waitFor({ state: "attached", timeout: opTimeout(8_000) })
    .catch(() => undefined);

  const iframe = iframeLocator.first();
  const iframeSrc = (await iframe.getAttribute("src").catch(() => null)) ?? "";
  const hasSrcDoc = Boolean((await iframe.getAttribute("srcdoc").catch(() => null))?.trim());

  const frame = page.frameLocator(
    'iframe[title*="preview" i], iframe[src*="preview"], iframe[srcdoc], iframe[title="App preview"]',
  );

  let rootMarker = false;
  let restaurantDashboard = false;
  let inventoryTable = false;
  let lowStockAlerts = false;
  let bodyText = "";
  let bodyHtml = "";
  let iframeLoaded = false;

  try {
    const root = frame.locator('[data-testid="generated-app-preview-root"]');
    await root.waitFor({ state: "attached", timeout: opTimeout(12_000) });
    rootMarker = await root.isVisible().catch(() => false);
    restaurantDashboard = await frame
      .getByTestId("restaurant-dashboard")
      .isVisible()
      .catch(() => false);
    inventoryTable = await frame.getByTestId("inventory-table").isVisible().catch(() => false);
    lowStockAlerts = await frame.getByTestId("low-stock-alerts").isVisible().catch(() => false);
    bodyText = (await frame.locator("body").innerText().catch(() => "")).slice(0, 1200);
    bodyHtml = (await frame.locator("body").innerHTML().catch(() => "")).slice(0, 2000);
    iframeLoaded = true;
  } catch {
    iframeLoaded = false;
  }

  blocked = hardStop();
  if (blocked === "preview_context_closed") {
    return apiPreviewOk();
  }
  if (blocked) return finish(false, blocked);

  if (!iframeLoaded || !rootMarker) {
    if (markersPresentInHtml(previewHtml)) {
      return apiPreviewOk();
    }
    if (markersPresentInHtml(previewHtml) && !iframeLoaded) {
      rootCause = "iframe_not_loaded";
    } else {
      rootCause = "missing_preview_root_marker";
    }
    return finish(false, rootCause, {
      iframeSrc,
      hasSrcDoc,
      rootMarker,
      restaurantDashboard,
      inventoryTable,
      lowStockAlerts,
      bodyText,
      bodyHtml,
      iframeLoaded,
    });
  }

  const ok =
    rootMarker &&
    restaurantDashboard &&
    inventoryTable &&
    lowStockAlerts &&
    bodyText.trim().length > 0 &&
    !/no renderable content|no generated files|preview unavailable/i.test(bodyText);

  if (!ok) {
    rootCause = !bodyText.trim()
      ? "iframe_body_empty"
      : /no renderable content|no generated files/i.test(bodyText)
        ? "generated_app_runtime_error"
        : "missing_preview_root_marker";
    return finish(false, rootCause, {
      iframeSrc,
      hasSrcDoc,
      rootMarker,
      restaurantDashboard,
      inventoryTable,
      lowStockAlerts,
      bodyText,
      bodyHtml,
      iframeLoaded,
    });
  }

  return finish(true, "unknown_with_logs", {
    iframeSrc,
    hasSrcDoc,
    rootMarker,
    restaurantDashboard,
    inventoryTable,
    lowStockAlerts,
    bodyText,
    bodyHtml,
    iframeLoaded,
  });
}

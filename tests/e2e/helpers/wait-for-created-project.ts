import type { APIRequestContext, Page } from "@playwright/test";
import { resolveAuthUserId } from "./e2e-auth-probe";

const META_IDEMPOTENCY = "create_idempotency_key";
const UUID_RE = /^[a-f0-9-]{36}$/i;
const LIST_TIMEOUT_MS = 20_000;

export type WaitForCreatedProjectResult = {
  projectId: string;
  ownerId: string;
  directReadOk: boolean;
  listVisible: boolean;
  listCountStale: boolean;
  duplicateByOperationId: number;
  builderOk: boolean;
  beforeListCount: number;
  afterListCount: number;
};

type ProjectListRow = { id?: string; metadata?: Record<string, unknown> | null };

function isTransientRequestError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /ECONNRESET|ECONNREFUSED|ETIMEDOUT|socket hang up|network/i.test(msg);
}

async function readProjectSummary(request: APIRequestContext, projectId: string) {
  const deadline = Date.now() + 90_000;
  let lastErr: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await request.get(`/api/projects/${projectId}/summary`, { timeout: 30_000 });
      if (!res.ok()) return { ok: false as const, status: res.status() };
      const body = (await res.json().catch(() => ({}))) as {
        project?: { id?: string; owner_id?: string; metadata?: Record<string, unknown> | null };
      };
      return { ok: true as const, body };
    } catch (err) {
      lastErr = err;
      if (!isTransientRequestError(err)) throw err;
      await new Promise((r) => setTimeout(r, 1_500));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr ?? "project_summary_timeout"));
}

export async function fetchVisibleProjects(
  request: APIRequestContext,
  reconcile = false,
): Promise<ProjectListRow[]> {
  const qs = reconcile ? "?reconcile=1" : "";
  const res = await request.get(`/api/projects${qs}`, { timeout: LIST_TIMEOUT_MS }).catch(() => null);
  if (!res?.ok()) return [];
  const data = (await res.json().catch(() => ({}))) as { projects?: ProjectListRow[] };
  return Array.isArray(data.projects) ? data.projects : [];
}

export async function countVisibleProjects(
  request: APIRequestContext,
  reconcile = false,
): Promise<number> {
  const list = await fetchVisibleProjects(request, reconcile);
  return list.length;
}

function countByOperationId(list: ProjectListRow[], operationId: string): number {
  const key = operationId.trim();
  if (!key) return 0;
  return list.filter((row) => {
    const meta =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? row.metadata
        : {};
    return meta[META_IDEMPOTENCY] === key || meta.operation_id === key;
  }).length;
}

/**
 * Prove project creation by ID + owner + builder — not fragile list count alone.
 */
export async function waitForCreatedProject(
  page: Page,
  request: APIRequestContext,
  input: {
    projectId: string;
    operationId?: string | null;
    beforeListCount?: number;
    listRetryMs?: number;
    authUserId?: string | null;
  },
): Promise<WaitForCreatedProjectResult> {
  const projectId = input.projectId.trim();
  if (!UUID_RE.test(projectId)) {
    throw new Error(`invalid_project_id:${projectId}`);
  }

  const authUserId = await resolveAuthUserId(page, request, input.authUserId);
  if (!authUserId) {
    throw new Error("auth_user_unresolved");
  }

  const summary = await readProjectSummary(request, projectId);
  if (!summary.ok) {
    throw new Error(`project_read_failed:${summary.status}`);
  }

  const proj = summary.body.project;
  if (!proj?.id || proj.id !== projectId) {
    throw new Error("project_read_missing_id");
  }
  if (proj.owner_id && proj.owner_id !== authUserId) {
    throw new Error(`project_owner_mismatch:${proj.owner_id}`);
  }

  const beforeListCount =
    input.beforeListCount ?? (await countVisibleProjects(request, false).catch(() => -1));

  const listDeadline = Date.now() + (input.listRetryMs ?? 30_000);
  let listVisible = false;
  let afterListCount = beforeListCount;

  while (Date.now() < listDeadline) {
    const list = await fetchVisibleProjects(request, false);
    afterListCount = list.length;
    if (list.some((p) => p.id === projectId)) {
      listVisible = true;
      break;
    }
    await page.waitForTimeout(400);
  }

  if (!listVisible) {
    const list = await fetchVisibleProjects(request, false).catch(() => []);
    afterListCount = list.length;
    listVisible = list.some((p) => p.id === projectId);
  }

  const listCountStale =
    !listVisible &&
    beforeListCount >= 0 &&
    afterListCount === beforeListCount &&
    summary.ok;

  if (listCountStale) {
    console.warn("[e2e] PROJECT_LIST_COUNT_STALE", {
      projectId,
      beforeListCount,
      afterListCount,
    });
  }

  let duplicateByOperationId = 0;
  if (input.operationId?.trim()) {
    const list = await fetchVisibleProjects(request, false);
    duplicateByOperationId = countByOperationId(list, input.operationId);
    if (duplicateByOperationId > 1) {
      throw new Error(`duplicate_project_operation_id:${duplicateByOperationId}`);
    }
    const meta =
      proj.metadata && typeof proj.metadata === "object" && !Array.isArray(proj.metadata)
        ? proj.metadata
        : {};
    const stored = meta[META_IDEMPOTENCY];
    if (stored && stored !== input.operationId.trim()) {
      throw new Error(`operation_id_metadata_mismatch:${String(stored)}`);
    }
  }

  await page.goto(`/apps/${projectId}/builder`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  let builderPath = "";
  try {
    builderPath = new URL(page.url()).pathname;
  } catch {
    builderPath = page.url();
  }
  const isNotFoundRoute =
    /\/404\/?$/.test(builderPath) ||
    builderPath.includes("/not-found") ||
    builderPath.endsWith("/404");
  const builderOk =
    !isNotFoundRoute &&
    builderPath.includes(`/apps/${projectId}/builder`) &&
    (await page.locator("body").count()) > 0;
  if (!builderOk) {
    throw new Error(`builder_route_not_accessible:${builderPath || page.url()}`);
  }

  return {
    projectId,
    ownerId: authUserId,
    directReadOk: true,
    listVisible,
    listCountStale,
    duplicateByOperationId,
    builderOk,
    beforeListCount,
    afterListCount,
  };
}

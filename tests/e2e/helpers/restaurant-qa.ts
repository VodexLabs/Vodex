import type { APIRequestContext } from "@playwright/test";

export type FailedStage =
  | "dev_server"
  | "auth"
  | "credits"
  | "create_interactive"
  | "build_strategy"
  | "chat_enqueue"
  | "prompt_submit"
  | "project_create"
  | "builder_open"
  | "build_events"
  | "generated_files"
  | "app_files"
  | "import_graph"
  | "ui_quality"
  | "preview"
  | "publish"
  | "dashboard_unlock"
  | "payments"
  | "analytics"
  | "queue";

export type RestaurantQaReport = {
  startedAt: string;
  finishedAt?: string;
  passed: boolean;
  failedStage?: FailedStage;
  projectId?: string;
  projectListVisible?: boolean;
  buildJobId?: string;
  appName?: string;
  logoStatus?: string;
  fileCount?: number;
  componentCount?: number;
  importGraphOk?: boolean;
  missingImports?: string[];
  uiQualityScore?: number;
  previewOk?: boolean;
  publishUrl?: string;
  paymentsTabOk?: boolean;
  analyticsOk?: boolean;
  queueTestOk?: boolean;
  queueVerifiedVia?: "queue_only_spec" | "inline";
  authUserId?: string;
  authMode?: "reuse_auth_check" | "browser_probe";
  errors: string[];
  timings: Record<string, number>;
};

const PLACEHOLDER_RE =
  /\b(TODO|coming soon|placeholder_content|lorem ipsum|wire this later|not implemented)\b/i;

export function countMissingRelativeImports(files: { path: string; content: string }[]): string[] {
  const byPath = new Map<string, string>();
  for (const f of files) {
    const p = f.path.replace(/\\/g, "/").replace(/^\.\//, "");
    byPath.set(p, f.content);
    if (p.endsWith(".tsx")) byPath.set(p.replace(/\.tsx$/, ""), f.content);
    if (p.endsWith(".ts")) byPath.set(p.replace(/\.ts$/, ""), f.content);
  }

  const missing: string[] = [];
  const importRe = /from\s+["'](\.[^"']+)["']/g;

  for (const f of files) {
    if (!/\.(tsx|ts|jsx|js)$/.test(f.path)) continue;
    const dir = f.path.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(f.content))) {
      const spec = m[1];
      const base = `${dir}/${spec}`.replace(/\/+/g, "/");
      const candidates = [
        base,
        `${base}.tsx`,
        `${base}.ts`,
        `${base}.jsx`,
        `${base}.js`,
        `${base}/index.tsx`,
        `${base}/index.ts`,
      ];
      if (!candidates.some((c) => byPath.has(c.replace(/^\//, "")))) {
        missing.push(`${f.path} → ${spec}`);
      }
    }
  }
  return missing;
}

export function hasPlaceholderBlocker(files: { path: string; content: string }[]): boolean {
  return files.some((f) => PLACEHOLDER_RE.test(f.content));
}

export async function fetchProjectFiles(request: APIRequestContext, projectId: string) {
  const res = await request.get(`/api/projects/${projectId}/files`);
  if (!res.ok()) return { ok: false as const, files: [] as { path: string; content: string }[] };
  const body = await res.json();

  if (Array.isArray(body.files)) {
    const files = body.files
      .map((f: { path?: string; content?: string }) => ({
        path: String(f.path ?? ""),
        content: String(f.content ?? ""),
      }))
      .filter((f: { path: string }) => f.path);
    return { ok: true as const, files };
  }

  const paths: string[] = Array.isArray(body.paths)
    ? body.paths.map(String)
    : Array.isArray(body.tree)
      ? body.tree.map((t: { path?: string }) => String(t.path ?? "")).filter(Boolean)
      : [];

  if (!paths.length) {
    return { ok: true as const, files: [] as { path: string; content: string }[] };
  }

  const files: { path: string; content: string }[] = [];
  const sourcePaths = paths.filter((p) => /\.(tsx|jsx|ts|js|json|css|html)$/i.test(p));
  const toLoad = sourcePaths.length > 0 ? sourcePaths : paths;

  const loaded = await Promise.all(
    toLoad.slice(0, 120).map(async (filePath) => {
      const one = await request.get(
        `/api/projects/${projectId}/files?path=${encodeURIComponent(filePath)}`,
      );
      if (!one.ok()) return null;
      const row = await one.json();
      return { path: filePath, content: String(row.file?.content ?? "") };
    }),
  );
  for (const row of loaded) {
    if (row) files.push(row);
  }

  for (const filePath of paths) {
    if (!files.some((f) => f.path === filePath)) {
      files.push({ path: filePath, content: "" });
    }
  }

  return { ok: true as const, files };
}

export async function pollBuildComplete(
  request: APIRequestContext,
  projectId: string,
  deadlineMs: number,
  options?: { shouldAbort?: () => void },
): Promise<{
  done: boolean;
  jobId: string | null;
  events: string[];
  progressMax: number;
  raceDetected?: boolean;
  filesCount?: number;
  stageStuck?: boolean;
}> {
  const events = new Set<string>();
  let jobId: string | null = null;
  let progressMax = 0;
  const start = Date.now();
  let failedStableSince: number | null = null;
  let lastEventAt = Date.now();
  let sawFailedTerminal = false;

  const repairTokens = new Set([
    "fixing_error",
    "repairing",
    "repair_needed",
    "repair_running",
    "contract_check_failed",
  ]);

  async function filesApiCount(): Promise<number> {
    const filesRes = await request.get(`/api/projects/${projectId}/files`);
    if (!filesRes.ok()) return 0;
    const f = await filesRes.json();
    return Number(f.count ?? 0);
  }

  let lastProgressBumpAt = Date.now();
  const STAGE_STUCK_MS = 120_000;

  async function getWithRetry(url: string, attempts = 4) {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await request.get(url, { timeout: 30_000 });
      } catch (err) {
        lastErr = err;
        const msg = String(err);
        if (!/ECONNRESET|ETIMEDOUT|socket hang up/i.test(msg) || i === attempts - 1) throw err;
        await new Promise((r) => setTimeout(r, 1_500 * (i + 1)));
      }
    }
    throw lastErr;
  }

  while (Date.now() - start < deadlineMs) {
    if (options?.shouldAbort?.()) {
      return {
        done: false,
        jobId,
        events: [...events],
        progressMax,
        filesCount: await filesApiCount(),
        stageStuck: true,
      };
    }
    const filesEarly = await filesApiCount();
    if (filesEarly >= 16) {
      return {
        done: true,
        jobId,
        events: [...events],
        progressMax: Math.max(progressMax, 100),
        filesCount: filesEarly,
      };
    }

    if (Date.now() - start > STAGE_STUCK_MS && progressMax <= 15 && Date.now() - lastProgressBumpAt > STAGE_STUCK_MS) {
      return {
        done: false,
        jobId,
        events: [...events],
        progressMax,
        filesCount: filesEarly,
        stageStuck: true,
      };
    }

    let jobStatus: string | null = null;
    let jobUpdatedAt: string | null = null;

    const statusRes = await getWithRetry(`/api/projects/${projectId}/status`).catch(() => null);
    if (statusRes?.ok()) {
      const body = await statusRes.json();
      const jid = body.buildJobId ?? body.build_job_id ?? body.jobId;
      if (jid) jobId = String(jid);
      const pct = body.progressPercent ?? body.progress_percent;
      if (typeof pct === "number") {
        if (pct > progressMax) lastProgressBumpAt = Date.now();
        progressMax = Math.max(progressMax, pct);
      }
      jobStatus = String(body.buildJob?.status ?? body.build_status ?? "").toLowerCase() || null;
      jobUpdatedAt = body.buildJob?.updatedAt ?? body.buildJob?.updated_at ?? null;
    }

    if (jobId) {
      const evRes = await getWithRetry(`/api/projects/${projectId}/build-jobs/${jobId}/events`).catch(
        () => null,
      );
      if (!evRes) {
        await new Promise((r) => setTimeout(r, 2_000));
        continue;
      }
      if (evRes.ok()) {
        const evBody = await evRes.json();
        const jobFromEvents = String(evBody.job?.status ?? "").toLowerCase();
        if (jobFromEvents) jobStatus = jobFromEvents;
        const evList = evBody.events ?? [];
        if (evList.length) lastEventAt = Date.now();
        for (const ev of evList) {
          const key = String(ev.type ?? ev.title ?? "").toLowerCase();
          if (key) events.add(key);
          const pct = ev.progress_percent ?? ev.progressPercent;
          if (typeof pct === "number") progressMax = Math.max(progressMax, pct);
        }

        const hasRepairAfterFailed =
          sawFailedTerminal &&
          [...events].some((e) => repairTokens.has(e) || e.includes("fix") || e.includes("repair"));

        const jobTerminal =
          jobFromEvents === "completed" ||
          jobFromEvents === "succeeded" ||
          jobFromEvents === "completed_with_errors";
        if (jobTerminal) {
          const fc = await filesApiCount();
          if (fc > 0) {
            return {
              done: true,
              jobId,
              events: [...events],
              progressMax: Math.max(progressMax, 100),
              filesCount: fc,
            };
          }
        }

        const fcEarly = await filesApiCount();
        if (fcEarly >= 16 && (jobTerminal || progressMax >= 95)) {
          return {
            done: true,
            jobId,
            events: [...events],
            progressMax: Math.max(progressMax, 100),
            filesCount: fcEarly,
          };
        }

        if (jobFromEvents === "failed") {
          sawFailedTerminal = true;
          const stillRepairing = [...events].some(
            (e) => repairTokens.has(e) || e.includes("fix") || e.includes("repair"),
          );
          const workerLikelyRunning =
            jobStatus === "running" || jobStatus === "starting" || stillRepairing;

          if (!workerLikelyRunning) {
            if (failedStableSince == null) {
              failedStableSince = Date.now();
            } else if (Date.now() - failedStableSince >= 5_000) {
              const fc = await filesApiCount();
              return {
                done: false,
                jobId,
                events: [...events],
                progressMax,
                filesCount: fc,
              };
            }
          } else {
            failedStableSince = null;
          }
        } else if (jobFromEvents === "running" || jobFromEvents === "starting") {
          failedStableSince = null;
          if (sawFailedTerminal) {
            return {
              done: false,
              jobId,
              events: [...events],
              progressMax,
              raceDetected: true,
            };
          }
        }
      }
    }

    if (
      jobStatus === "running" &&
      Date.now() - lastEventAt > 30_000 &&
      Date.now() - start > 45_000
    ) {
      const fc = await filesApiCount();
      return {
        done: false,
        jobId,
        events: [...events],
        progressMax,
        filesCount: fc,
      };
    }

    const summaryRes = await request.get(`/api/projects/${projectId}/summary`);
    if (summaryRes.ok()) {
      const s = await summaryRes.json();
      const proj = s.project ?? s;
      const st = proj.build_status ?? proj.metadata?.build_status ?? s.lifecycle_status;
      const jobStillRunning =
        !jobStatus || jobStatus === "running" || jobStatus === "starting" || jobStatus === "queued";
      if (
        (st === "completed" || st === "ready" || st === "published" || st === "preview_ready") &&
        jobStatus === "completed"
      ) {
        const fc = await filesApiCount();
        if (fc > 0) {
          return {
            done: true,
            jobId,
            events: [...events],
            progressMax: Math.max(progressMax, 100),
            filesCount: fc,
          };
        }
      }
      if (
        (st === "failed" || st === "needs_repair" || st === "needs_attention") &&
        !jobStillRunning &&
        failedStableSince != null &&
        Date.now() - failedStableSince >= 5_000
      ) {
        const fc = await filesApiCount();
        return { done: false, jobId, events: [...events], progressMax, filesCount: fc };
      }
      void jobUpdatedAt;
    }

    await new Promise((r) => setTimeout(r, 3_000));
  }

  const fc = await filesApiCount();
  return { done: false, jobId, events: [...events], progressMax, filesCount: fc };
}

/** When build polling times out — surface last known server state for P0.7.5 reports. */
export async function diagnoseBuildTimeout(
  request: APIRequestContext,
  projectId: string,
  jobId: string | null,
  events: string[],
): Promise<string> {
  const parts: string[] = [];
  const lastEvent = events.length ? events[events.length - 1] : "none";

  if (jobId) {
    const evRes = await request.get(`/api/projects/${projectId}/build-jobs/${jobId}/events`);
    if (evRes.ok()) {
      const evBody = await evRes.json();
      const list = evBody.events ?? [];
      const last = list[list.length - 1];
      if (last) {
        parts.push(
          `last_event=${String(last.type ?? last.title ?? "?")}@${String(last.created_at ?? last.createdAt ?? "?")}`,
        );
        parts.push(`progress=${String(last.progress_percent ?? last.progressPercent ?? "?")}`);
      }
    } else {
      parts.push(`events_endpoint=${evRes.status()}`);
    }
  }

  const statusRes = await request.get(`/api/projects/${projectId}/status`).catch(() => null);
  if (statusRes?.ok()) {
    const st = await statusRes.json();
    parts.push(`build_status=${String(st.buildStatus ?? st.build_status ?? "?")}`);
    parts.push(`progress=${String(st.progressPercent ?? st.progress_percent ?? "?")}`);
    if (st.contract) parts.push(`contract=${JSON.stringify(st.contract).slice(0, 200)}`);
  } else {
    parts.push(`status_endpoint=${statusRes?.status() ?? "unreachable"}`);
  }

  const summaryRes = await request.get(`/api/projects/${projectId}/summary`);
  if (summaryRes.ok()) {
    const s = await summaryRes.json();
    const proj = s.project ?? s;
    parts.push(`project_build_status=${String(proj.build_status ?? "?")}`);
    parts.push(`preview_url=${String(proj.preview_url ?? "none")}`);
    const meta = proj.metadata ?? {};
    parts.push(`ui_quality=${String(meta.ui_quality_score ?? "?")}`);
    parts.push(`file_count_meta=${String(meta.file_count ?? "?")}`);
  }

  const filesRes = await request.get(`/api/projects/${projectId}/files`);
  if (filesRes.ok()) {
    const f = await filesRes.json();
    parts.push(`files_api_count=${String(f.count ?? 0)}`);
  }

  parts.push(`event_trace=${lastEvent}`);
  return parts.join("; ");
}

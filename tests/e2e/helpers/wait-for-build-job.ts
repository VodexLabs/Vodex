import type { APIRequestContext } from "@playwright/test";

/** Wait until /api/projects/:id/status reports an active or completed build job. */
export async function waitForBuildJobStarted(
  request: APIRequestContext,
  projectId: string,
  timeoutMs = 180_000,
): Promise<{ jobId: string | null; progress: number; status: string | null }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const statusRes = await request.get(`/api/projects/${projectId}/status`).catch(() => null);
    if (statusRes?.ok()) {
      const body = await statusRes.json();
      const job = (body.buildJob ?? body.build_job) as
        | { id?: string; status?: string; progress?: number }
        | undefined;
      const jobId = String(job?.id ?? body.buildJobId ?? "").trim() || null;
      const progress = Number(job?.progress ?? body.progressPercent ?? body.progress_percent ?? 0);
      const status = job?.status ? String(job.status).toLowerCase() : null;
      const filesCount = Number(body.files?.count ?? 0);
      if (filesCount > 0 && jobId) {
        return { jobId, progress: Math.max(progress, 100), status: status ?? "completed" };
      }
      if (
        jobId &&
        (progress > 0 ||
          status === "running" ||
          status === "starting" ||
          status === "queued" ||
          status === "completed" ||
          status === "succeeded" ||
          status === "failed")
      ) {
        return { jobId, progress, status };
      }
    }

    await new Promise((r) => setTimeout(r, 2_000));
  }
  return { jobId: null, progress: 0, status: null };
}

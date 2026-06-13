import { appUrl } from "@/lib/app-url";
import { isServerlessHost } from "@/lib/imports/preview-build-queue";

function buildRunSecret(): string | null {
  return (
    process.env.DREAMOS_BUILD_RUN_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    null
  );
}

/** Fire a separate long-running serverless invocation (maxDuration route) for AI builds. */
export async function kickStagedBuildWorker(input: {
  projectId: string;
  buildJobId: string;
  requestUrl?: string;
  /** When false (default), return after the run route accepts — do not wait for full build. */
  waitForCompletion?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const secret = buildRunSecret();
  if (!secret) {
    return { ok: false, error: "missing_build_run_secret" };
  }

  const url = appUrl(
    `/api/projects/${input.projectId}/build-jobs/${input.buildJobId}/run`,
    input.requestUrl,
  );

  const fetchPromise = fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      "X-DreamOS-Build-Kick": "1",
    },
    body: JSON.stringify({ build_job_id: input.buildJobId }),
    cache: "no-store",
  });

  if (!input.waitForCompletion) {
    void fetchPromise.catch((err) => {
      console.error("[kick-staged-build] fire_and_forget_failed", {
        buildJobId: input.buildJobId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
    return { ok: true };
  }

  try {
    const res = await fetchPromise;
    if (!res.ok && res.status !== 202) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: `kick_http_${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function shouldUseLongRunningBuildRoute(): boolean {
  if (!isServerlessHost()) return false;
  if (process.env.DREAMOS_INLINE_ASYNC_BUILD === "1") return false;
  return process.env.DREAMOS_USE_AFTER_BUILD !== "1";
}

export function buildMaxDurationSec(): number {
  const raw = Number(process.env.DREAMOS_BUILD_MAX_DURATION_SEC ?? 800);
  if (!Number.isFinite(raw) || raw < 60) return 800;
  return Math.min(raw, 800);
}

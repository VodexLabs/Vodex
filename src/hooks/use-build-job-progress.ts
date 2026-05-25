"use client";

import * as React from "react";
import type { BuildJobEventRow } from "@/lib/build/build-job-events";

export type BuildJobPollState = {
  jobId: string;
  eventsUrl: string;
  status: string | null;
  events: BuildJobEventRow[];
  latest: BuildJobEventRow | null;
  progressPercent: number;
  error: string | null;
  done: boolean;
};

export function useBuildJobProgress(
  job: { jobId: string; eventsUrl: string } | null,
  onTerminal?: (state: BuildJobPollState) => void,
) {
  const [state, setState] = React.useState<BuildJobPollState | null>(null);

  React.useEffect(() => {
    if (!job) {
      setState(null);
      return;
    }

    let cancelled = false;
    let afterCursor: string | null = null;

    const poll = async () => {
      const url = afterCursor
        ? `${job.eventsUrl}?after=${encodeURIComponent(afterCursor)}`
        : job.eventsUrl;
      try {
        const res = await fetch(url, { credentials: "include" });
        const body = (await res.json()) as {
          job?: { status?: string; error_message?: string | null };
          events?: Array<{
            id: string;
            created_at: string;
            type: string;
            title: string;
            detail: string | null;
            file_path: string | null;
            progress_percent: number | null;
            metadata?: Record<string, unknown>;
          }>;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setState((prev) =>
            prev
              ? { ...prev, error: body.error ?? "Could not load build progress" }
              : {
                  jobId: job.jobId,
                  eventsUrl: job.eventsUrl,
                  status: null,
                  events: [],
                  latest: null,
                  progressPercent: 0,
                  error: body.error ?? "Could not load build progress",
                  done: false,
                },
          );
          return;
        }

        const incoming = (body.events ?? []).map(
          (e): BuildJobEventRow => ({
            id: e.id,
            created_at: e.created_at,
            job_id: job.jobId,
            project_id: "",
            user_id: "",
            type: e.type as BuildJobEventRow["type"],
            title: e.title,
            detail: e.detail,
            file_path: e.file_path,
            progress_percent: e.progress_percent,
            metadata: (e.metadata ?? {}) as Record<string, unknown>,
          }),
        );

        if (incoming.length) {
          afterCursor = incoming[incoming.length - 1]!.created_at;
        }

        const jobStatus = body.job?.status ?? null;
        const terminal =
          jobStatus === "completed" ||
          jobStatus === "failed" ||
          incoming.some((e) => e.type === "completed" || e.type === "failed");

        setState((prev) => {
          const merged = [...(prev?.events ?? []), ...incoming];
          const latest = merged[merged.length - 1] ?? null;
          const progressPercent =
            latest?.progress_percent ??
            (terminal ? 100 : Math.min(90, merged.length * 4));
          const next: BuildJobPollState = {
            jobId: job.jobId,
            eventsUrl: job.eventsUrl,
            status: jobStatus,
            events: merged,
            latest,
            progressPercent,
            error: body.job?.error_message ?? null,
            done: terminal,
          };
          if (terminal) onTerminal?.(next);
          return next;
        });
      } catch (err) {
        if (cancelled) return;
        setState((prev) =>
          prev
            ? {
                ...prev,
                error: err instanceof Error ? err.message : "Progress poll failed",
              }
            : null,
        );
      }
    };

    void poll();
    const id = setInterval(() => void poll(), 800);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [job?.jobId, job?.eventsUrl, onTerminal]);

  return state;
}

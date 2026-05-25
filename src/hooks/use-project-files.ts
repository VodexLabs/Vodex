"use client";

import * as React from "react";
import { fetchDedupe, getCached, invalidateCache, setCached } from "@/lib/cache/fetch-dedupe";

export type ProjectFileRef = { path: string; content: string };

type FilesListResponse = { paths?: string[]; count?: number; error?: string };
async function loadPaths(projectId: string, signal: AbortSignal): Promise<string[]> {
  const res = await fetch(`/api/projects/${projectId}/files`, { credentials: "include", signal });
  const body = (await res.json()) as FilesListResponse;
  if (!res.ok) throw new Error(body.error ?? "Could not load files");
  return body.paths ?? [];
}

export function invalidateProjectFilesCache(projectId: string) {
  invalidateCache(`project-files:${projectId}`);
}

export function useProjectFiles(projectId: string | null, refreshKey = 0) {
  const [files, setFiles] = React.useState<ProjectFileRef[]>(() => {
    if (!projectId) return [];
    const cached = getCached<ProjectFileRef[]>(`project-files:${projectId}`, 120_000);
    return cached ?? [];
  });
  const [loading, setLoading] = React.useState(() => {
    if (!projectId) return false;
    return !getCached<ProjectFileRef[]>(`project-files:${projectId}`, 120_000);
  });
  const [hasFetchedOnce, setHasFetchedOnce] = React.useState(() =>
    projectId ? Boolean(getCached<ProjectFileRef[]>(`project-files:${projectId}`, 120_000)) : false,
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!projectId) {
      setFiles([]);
      setLoading(false);
      setHasFetchedOnce(true);
      return;
    }

    const cacheKey = `project-files:${projectId}`;
    const stale = getCached<ProjectFileRef[]>(cacheKey, 120_000);
    if (stale?.length) {
      setFiles(stale);
      setHasFetchedOnce(true);
      setLoading(false);
    } else {
      setLoading(true);
    }

    let cancelled = false;
    void fetchDedupe(
      `${cacheKey}:${refreshKey}`,
      async (signal) => {
        const paths = await loadPaths(projectId, signal);
        return paths.map((path) => ({ path, content: "" }));
      },
      { maxAgeMs: 30_000, force: refreshKey > 0 },
    )
      .then((refs) => {
        if (cancelled) return;
        setCached(cacheKey, refs);
        setFiles(refs);
        setError(null);
        setHasFetchedOnce(true);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load files");
        setHasFetchedOnce(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, refreshKey]);

  return { files, loading, hasFetchedOnce, error, pathCount: files.length };
}

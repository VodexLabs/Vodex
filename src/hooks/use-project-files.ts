"use client";

import * as React from "react";
import { fetchDedupe, getCached, invalidateCache, setCached } from "@/lib/cache/fetch-dedupe";
import { preferredEntryFile } from "@/lib/projects/imported-project-state";
import { normalizeBuildFilePath } from "@/lib/build/generated-file-utils";

export type ProjectFileRef = { path: string; content: string };

type FilesListResponse = {
  paths?: string[];
  tree?: Array<{ path: string; size_bytes?: number | null }>;
  count?: number;
  error?: string;
};

export type UseProjectFilesOptions = {
  /** When false, only paths are loaded — content stays empty until Code tab needs it. */
  loadContent?: boolean;
};

async function loadPaths(projectId: string, signal: AbortSignal): Promise<{
  paths: string[];
  sizes: Map<string, number>;
}> {
  const res = await fetch(`/api/projects/${projectId}/files`, { credentials: "include", signal });
  const body = (await res.json()) as FilesListResponse;
  if (!res.ok) throw new Error(body.error ?? "Could not load files");
  const paths = (body.paths ?? []).map((p) => normalizeBuildFilePath(p));
  const sizes = new Map<string, number>();
  for (const row of body.tree ?? []) {
    if (row.path && typeof row.size_bytes === "number") sizes.set(row.path, row.size_bytes);
  }
  return { paths, sizes };
}

async function prefetchFileContent(
  projectId: string,
  path: string,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch(
    `/api/projects/${projectId}/files?path=${encodeURIComponent(path)}`,
    { credentials: "include", signal },
  );
  const body = (await res.json()) as { file?: { content?: string }; error?: string };
  if (!res.ok) return "";
  return body.file?.content ?? "";
}

function pickPrefetchPaths(paths: string[], sizes: Map<string, number>): string[] {
  const picks = new Set<string>();
  const meaningful = [...paths]
    .filter((p) => (sizes.get(p) ?? 0) >= 350)
    .sort((a, b) => (sizes.get(b) ?? 0) - (sizes.get(a) ?? 0));
  for (const p of meaningful) {
    if (picks.size >= 8) break;
    picks.add(p);
  }

  const entry = preferredEntryFile(paths);
  if (entry) picks.add(entry);

  const bySize = [...paths].sort((a, b) => (sizes.get(b) ?? 0) - (sizes.get(a) ?? 0));
  for (const p of bySize) {
    if (picks.size >= 16) break;
    if (/page\.(tsx|jsx)$/i.test(p) || p === "package.json" || p.endsWith("layout.tsx")) {
      picks.add(p);
    }
  }
  for (const p of paths) {
    if (picks.size >= 16) break;
    picks.add(p);
  }
  return [...picks];
}

export function invalidateProjectFilesCache(projectId: string) {
  invalidateCache(`project-files:${projectId}`);
  invalidateCache(`project-file-paths:${projectId}`);
}

export function useProjectFiles(
  projectId: string | null,
  refreshKey = 0,
  options?: UseProjectFilesOptions,
) {
  const loadContent = options?.loadContent ?? false;
  const cacheKey = projectId
    ? loadContent
      ? `project-files:${projectId}`
      : `project-file-paths:${projectId}`
    : "";

  const [files, setFiles] = React.useState<ProjectFileRef[]>(() => {
    if (!projectId) return [];
    const cached = getCached<ProjectFileRef[]>(cacheKey, 120_000);
    return cached ?? [];
  });
  const [loading, setLoading] = React.useState(() => {
    if (!projectId) return false;
    return !getCached<ProjectFileRef[]>(cacheKey, 120_000);
  });
  const [hasFetchedOnce, setHasFetchedOnce] = React.useState(() =>
    projectId ? Boolean(getCached<ProjectFileRef[]>(cacheKey, 120_000)) : false,
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!projectId) {
      setFiles([]);
      setLoading(false);
      setHasFetchedOnce(true);
      return;
    }

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
        const { paths, sizes } = await loadPaths(projectId, signal);
        if (!loadContent) {
          return paths.map((path) => ({ path, content: "" }));
        }
        const prefetch = pickPrefetchPaths(paths, sizes);
        const contentByPath = new Map<string, string>();
        await Promise.all(
          prefetch.map(async (path) => {
            const content = await prefetchFileContent(projectId, path, signal);
            contentByPath.set(path, content);
          }),
        );
        return paths.map((path) => ({
          path,
          content: contentByPath.get(path) ?? "",
        }));
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
  }, [projectId, refreshKey, cacheKey, loadContent]);

  return { files, loading, hasFetchedOnce, error, pathCount: files.length };
}

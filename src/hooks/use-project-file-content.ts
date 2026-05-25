"use client";

import * as React from "react";
import { fetchDedupe } from "@/lib/cache/fetch-dedupe";

async function loadFileContent(projectId: string, path: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(
    `/api/projects/${projectId}/files?path=${encodeURIComponent(path)}`,
    { credentials: "include", signal },
  );
  const body = (await res.json()) as { file?: { content?: string }; error?: string };
  if (!res.ok || !body.file) return "";
  return body.file.content ?? "";
}

/** Lazy-load a single file body when the user selects it in the code tree. */
export function useProjectFileContent(projectId: string | null, path: string | null) {
  const [content, setContent] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!projectId || !path) {
      setContent("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchDedupe(`file-body:${projectId}:${path}`, (signal) =>
      loadFileContent(projectId, path, signal),
    )
      .then((body) => {
        if (!cancelled) setContent(body);
      })
      .catch(() => {
        if (!cancelled) setContent("");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, path]);

  return { content, loading };
}

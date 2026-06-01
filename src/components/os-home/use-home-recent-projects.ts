"use client";

import * as React from "react";
import type { YourAppsProject } from "@/components/os-home/your-apps-section";

export function useHomeRecentProjects() {
  const [projects, setProjects] = React.useState<YourAppsProject[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/home/recent-projects", { credentials: "include" });
        if (!res.ok) return;
        const payload = (await res.json()) as { projects?: YourAppsProject[] };
        if (!cancelled && Array.isArray(payload.projects)) {
          setProjects(payload.projects);
        }
      } catch {
        /* non-blocking */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { projects, loading };
}

"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { BarChart2, Loader2, ChevronDown } from "lucide-react";
import { variants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { InsightsDashboardPanel } from "@/components/dashboard/dashboard-panels-p44";
import { resolveDisplayPublicUrl } from "@/lib/publish/publish-display-url";

type ProjectRow = {
  id: string;
  name: string;
  app_name?: string | null;
  published_subdomain?: string | null;
  custom_domain?: string | null;
};

export function AnalyticsView() {
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void fetch("/api/projects", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        const rows = (j.projects ?? j ?? []) as ProjectRow[];
        setProjects(rows);
        if (rows[0]?.id) setProjectId(rows[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const selected = projects.find((p) => p.id === projectId) ?? null;
  const publicUrl = selected
    ? resolveDisplayPublicUrl({ published_subdomain: selected.published_subdomain })
    : null;

  return (
    <motion.div
      variants={variants.staggerContainer}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-6xl space-y-6 px-4 py-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent">
            <BarChart2 className="size-5" strokeWidth={1.75} />
            <span className="text-[12px] font-semibold uppercase tracking-wider">Analytics</span>
          </div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-foreground">
            App performance
          </h1>
          <p className="mt-1 max-w-xl text-[14px] text-muted-foreground">
            Premium traffic insights for your published apps — page views, sessions, conversion, and live visitors.
          </p>
        </div>
        {projects.length > 1 ? (
          <div className="relative">
            <select
              value={projectId ?? ""}
              onChange={(e) => setProjectId(e.target.value)}
              className="appearance-none rounded-xl bg-surface py-2 pl-3 pr-9 text-[13px] font-medium ring-1 ring-border"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.app_name ?? p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-6 animate-spin text-accent" />
        </div>
      ) : !projectId ? (
        <div className={cn("rounded-[var(--radius-xl)] bg-surface px-6 py-14 text-center ring-1 ring-border")}>
          <p className="text-[15px] font-medium text-foreground">No apps yet</p>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Publish an app to start collecting analytics.
          </p>
        </div>
      ) : (
        <InsightsDashboardPanel projectId={projectId} publicUrl={publicUrl} />
      )}
    </motion.div>
  );
}

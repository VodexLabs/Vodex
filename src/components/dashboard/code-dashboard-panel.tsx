"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Code2, FileCode2, Route, Component, Server } from "lucide-react";

export function CodeDashboardPanel({
  projectId,
  fileCount,
  filePaths,
}: {
  projectId: string;
  fileCount: number;
  filePaths: string[];
}) {
  const components = filePaths.filter((p) => /components?\//i.test(p) && /\.(tsx|jsx)$/i.test(p));
  const apiRoutes = filePaths.filter((p) => /api\//i.test(p) && /\.(ts|js)$/i.test(p));
  const routes = filePaths.filter(
    (p) => /\/(page|pages)\//i.test(p) || /page\.(tsx|jsx|html)$/i.test(p),
  );

  const stats = [
    { label: "Files", value: fileCount, icon: FileCode2 },
    { label: "Components", value: components.length, icon: Component },
    { label: "Routes", value: routes.length, icon: Route },
    { label: "API routes", value: apiRoutes.length, icon: Server },
  ];

  return (
    <div className="space-y-4" data-testid="code-dashboard-panel">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl bg-gradient-to-br from-surface to-muted/20 p-3 ring-1 ring-border"
            >
              <Icon className="size-4 text-accent" />
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="text-[22px] font-bold tabular-nums">{s.value}</p>
            </motion.div>
          );
        })}
      </div>

      <Link
        href={`/apps/${projectId}/builder?tab=code`}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-[13px] font-semibold text-white shadow-sm hover:bg-accent/90"
      >
        <Code2 className="size-4" />
        Open code editor
      </Link>

      {routes.length > 0 ? (
        <div className="rounded-2xl bg-surface p-4 ring-1 ring-border">
          <p className="mb-2 text-[12px] font-semibold">Detected routes</p>
          <ul className="max-h-48 space-y-1 overflow-y-auto font-mono text-[11px]">
            {routes.slice(0, 20).map((p) => (
              <li key={p} className="truncate rounded-lg bg-background/80 px-2 py-1 ring-1 ring-border/50">
                {p}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

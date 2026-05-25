"use client";

import * as React from "react";
import {
  Box,
  Database,
  ShieldCheck,
  Globe,
  Cloud,
  Layers,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GraphEdge, GraphNode, GraphNodeKind } from "@/components/projects/architecture-graph";

const NODE_META: Record<
  GraphNodeKind,
  { icon: React.ElementType; color: string; bg: string }
> = {
  app: { icon: Box, color: "#1e6bff", bg: "rgba(30,107,255,0.10)" },
  database: { icon: Database, color: "#06b6d4", bg: "rgba(6,182,212,0.10)" },
  auth: { icon: ShieldCheck, color: "#ef4444", bg: "rgba(239,68,68,0.10)" },
  storage: { icon: Cloud, color: "#a855f7", bg: "rgba(168,85,247,0.10)" },
  edge: { icon: Wifi, color: "#10b981", bg: "rgba(16,185,129,0.10)" },
  deployment: { icon: Layers, color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
  integration: { icon: Box, color: "#8b5cf6", bg: "rgba(139,92,246,0.10)" },
  domain: { icon: Globe, color: "#0ea5e9", bg: "rgba(14,165,233,0.10)" },
};

const TIER_ORDER: GraphNodeKind[] = [
  "domain",
  "app",
  "auth",
  "database",
  "storage",
  "edge",
  "deployment",
  "integration",
];

function orderWorkflowNodes(nodes: GraphNode[]): GraphNode[] {
  const byKind = new Map<GraphNodeKind, GraphNode[]>();
  for (const n of nodes) {
    const list = byKind.get(n.kind) ?? [];
    list.push(n);
    byKind.set(n.kind, list);
  }
  const ordered: GraphNode[] = [];
  for (const kind of TIER_ORDER) {
    const list = byKind.get(kind);
    if (list) ordered.push(...list);
  }
  const seen = new Set(ordered.map((n) => n.id));
  for (const n of nodes) {
    if (!seen.has(n.id)) ordered.push(n);
  }
  return ordered;
}

/** Vertical, scrollable architecture workflow (view-only). */
export function ArchitectureWorkflowView({
  nodes,
  edges,
  className,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  className?: string;
}) {
  const ordered = React.useMemo(() => orderWorkflowNodes(nodes), [nodes]);
  const edgeByTo = React.useMemo(() => {
    const m = new Map<string, GraphEdge>();
    for (const e of edges) {
      if (!m.has(e.to)) m.set(e.to, e);
    }
    return m;
  }, [edges]);

  if (ordered.length === 0) {
    return (
      <p className="py-8 text-center text-[12.5px] text-muted-foreground">
        No architecture nodes yet. Build or connect services to populate this view.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "max-h-[min(72vh,640px)] overflow-y-auto rounded-[var(--radius-xl)] bg-background ring-1 ring-border",
        className,
      )}
    >
      <div
        className="relative min-h-[280px] bg-[linear-gradient(to_bottom,transparent_31px,rgba(148,163,184,0.12)_32px)] bg-[length:100%_32px] p-6"
        aria-label="Architecture workflow"
      >
        <ol className="relative mx-auto flex max-w-md flex-col gap-0">
          {ordered.map((node, i) => {
            const meta = NODE_META[node.kind];
            const Icon = meta.icon;
            const incoming = edgeByTo.get(node.id);
            const isLast = i === ordered.length - 1;
            return (
              <li key={node.id} className="relative flex flex-col items-center pb-8 last:pb-2">
                {!isLast && (
                  <span
                    className="absolute left-1/2 top-[calc(100%-2rem)] z-0 h-8 w-px -translate-x-1/2 bg-border"
                    aria-hidden
                  />
                )}
                <div
                  className={cn(
                    "relative z-[1] flex w-full max-w-sm items-center gap-3 rounded-2xl bg-background px-4 py-3 ring-1 ring-border shadow-[var(--shadow-xs)]",
                    node.kind === "app" && "ring-2 ring-accent/25",
                  )}
                  style={{ borderColor: node.kind === "app" ? meta.color : undefined }}
                >
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: meta.bg, color: meta.color }}
                  >
                    <Icon className="size-5" strokeWidth={1.65} />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[13px] font-semibold text-foreground">{node.label}</p>
                    {node.sublabel && (
                      <p className="text-[11px] text-muted-foreground">{node.sublabel}</p>
                    )}
                    {incoming?.inferred && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground/70">Inferred connection</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground ring-1 ring-border">
                    {node.kind}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, ListTodo, Hammer, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuildBacklogItem } from "@/lib/build/build-backlog";

type BacklogResponse = {
  items: BuildBacklogItem[];
  queuedCount: number;
  estimatedNextPassCredits: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  ui: "UI",
  backend: "Backend",
  auth: "Auth",
  database: "Database",
  integration: "Integrations",
  analytics: "Analytics",
  polish: "Polish",
  mobile: "Mobile",
  payments: "Payments",
  deployment: "Deployment",
};

export function BuildBacklogPanel({
  projectId,
  onContinue,
  className,
}: {
  projectId: string;
  onContinue?: (prompt: string) => void;
  className?: string;
}) {
  const [data, setData] = React.useState<BacklogResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/projects/${projectId}/backlog`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load backlog");
        return res.json() as Promise<BacklogResponse>;
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const queued = data?.items.filter((i) => i.status === "queued") ?? [];

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <Loader2 className="size-3.5 animate-spin" />
        Loading queued upgrades…
      </div>
    );
  }

  if (error || !data) return null;
  if (queued.length === 0) return null;

  return (
    <div className={cn("rounded-xl bg-white/90 p-3 ring-1 ring-border/70", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListTodo className="size-3.5 text-accent" />
          <p className="text-[11px] font-semibold text-foreground">Queued for next pass</p>
        </div>
        <span className="text-[10px] text-muted-foreground">
          ~{data.estimatedNextPassCredits} credits next
        </span>
      </div>

      <ul className="mt-2 space-y-1.5">
        {queued.slice(0, 6).map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-2 text-[10px] text-muted-foreground"
          >
            <span className="text-foreground">{item.title}</span>
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wide">
              {CATEGORY_LABELS[item.category] ?? item.category}
            </span>
          </li>
        ))}
      </ul>

      {queued.length > 6 && (
        <p className="mt-1 text-[10px] text-muted-foreground">+{queued.length - 6} more queued</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {onContinue ? (
          <button
            type="button"
            onClick={() =>
              onContinue("Continue building the next highest-value features from the queued backlog.")
            }
            className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-[10px] font-medium text-accent-foreground"
          >
            <Hammer className="size-3" />
            Continue building
          </button>
        ) : (
          <Link
            href={`/apps/${projectId}/builder?continue=1`}
            className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-[10px] font-medium text-accent-foreground"
          >
            <Hammer className="size-3" />
            Continue building
            <ChevronRight className="size-3" />
          </Link>
        )}
        <Link
          href={`/apps/${projectId}/builder?backlog=1`}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border/70"
        >
          View queued upgrades
        </Link>
      </div>
    </div>
  );
}

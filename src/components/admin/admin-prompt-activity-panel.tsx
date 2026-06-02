"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type PromptFilter = "all" | "success" | "failed";

type PromptStats = {
  total: number;
  success: number;
  failed: number;
};

type LivePromptRow = {
  id: string;
  created_at: string;
  user_email: string;
  model_id: string;
  mode: string;
  tokens_charged: number;
  status: string;
  error_message?: string | null;
  operation_id?: string | null;
};

const FILTER_LABELS: Record<PromptFilter, string> = {
  all: "All",
  success: "Successful",
  failed: "Failed",
};

export function AdminPromptActivityPanel() {
  const [filter, setFilter] = React.useState<PromptFilter>("all");
  const [stats, setStats] = React.useState<PromptStats | null>(null);
  const [live, setLive] = React.useState<LivePromptRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [statsRes, liveRes] = await Promise.all([
        fetch("/api/admin/ai-usage/prompt-stats", { credentials: "include" }),
        fetch(`/api/admin/ai-usage?limit=24&filter=${filter}`, { credentials: "include" }),
      ]);
      const statsJson = (await statsRes.json()) as { stats?: PromptStats; error?: string };
      const liveJson = (await liveRes.json()) as { events?: LivePromptRow[]; error?: string };
      if (statsJson.error) setError(statsJson.error);
      else setError(null);
      if (statsJson.stats) setStats(statsJson.stats);
      if (liveRes.ok) setLive(liveJson.events ?? []);
      else if (liveJson.error) setError(liveJson.error);
    } catch {
      setError("Failed to load prompt activity");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  React.useEffect(() => {
    setLoading(true);
    void load();
    const id = setInterval(() => void load(), 12_000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface/40 p-4">
      <div>
        <h3 className="text-[14px] font-semibold text-foreground">Prompt usage (90 days)</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">
          All billed AI operations — includes failed and successful builds. Billing token totals are unchanged;
          this is read-only observability.
        </p>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{error}</p>
      ) : null}

      {stats ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ["Total prompts", stats.total, "all"],
              ["Successful", stats.success, "success"],
              ["Failed", stats.failed, "failed"],
            ] as const
          ).map(([label, value, key]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-lg px-3 py-2.5 text-left ring-1 transition",
                filter === key
                  ? "bg-accent/10 ring-accent/40"
                  : "bg-background ring-border hover:bg-muted/40",
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 text-[20px] font-semibold tabular-nums text-foreground">{value}</p>
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(Object.keys(FILTER_LABELS) as PromptFilter[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-medium ring-1",
              filter === key
                ? "bg-accent text-white ring-accent"
                : "bg-background text-foreground ring-border",
            )}
          >
            {FILTER_LABELS[key]} live
          </button>
        ))}
      </div>

      <div className="rounded-lg bg-background ring-1 ring-border">
        <p className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Live prompts — {FILTER_LABELS[filter]}
        </p>
        {live.length === 0 ? (
          <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">
            {loading ? "Loading…" : `No ${filter === "all" ? "" : filter + " "}prompts in this view.`}
          </p>
        ) : (
          <ul className="max-h-64 divide-y divide-border/60 overflow-y-auto">
            {live.map((row) => {
              const ok = row.status === "success";
              return (
                <li key={row.id} className="flex items-start gap-2 px-3 py-2 text-[11px]">
                  <span
                    className={cn(
                      "mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                      ok ? "bg-emerald-500/15 text-emerald-700" : "bg-destructive/10 text-destructive",
                    )}
                  >
                    {ok ? "OK" : "Fail"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-foreground">
                      <span className="text-muted-foreground">{row.mode}</span>
                      {" · "}
                      {row.model_id}
                      {" · "}
                      {row.tokens_charged} cr
                    </p>
                    <p className="truncate text-muted-foreground">
                      {row.user_email || "—"}
                      {row.operation_id ? ` · ${row.operation_id.slice(0, 8)}` : ""}
                    </p>
                    {!ok && row.error_message ? (
                      <p className="mt-0.5 line-clamp-2 text-destructive/90">{row.error_message}</p>
                    ) : null}
                  </div>
                  <time className="shrink-0 tabular-nums text-muted-foreground">
                    {new Date(row.created_at).toLocaleTimeString()}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { BarChart2, Zap, Cpu, Upload, Rocket, Loader2 } from "lucide-react";
import { variants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useCreditsStore } from "@/lib/stores/credits-store";

type DailyPoint = { date: string; credits: number; generations: number };
type ModelBreakdown = Record<string, number>;

type AnalyticsData = {
  daily: DailyPoint[];
  model_breakdown: ModelBreakdown;
  totals: {
    credits_used: number;
    generations: number;
    deployments: number;
    uploads: number;
  };
};

function MiniBarChart({ data, valueKey }: { data: DailyPoint[]; valueKey: "credits" | "generations" }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="flex h-14 items-end gap-0.5">
      {data.map((d) => {
        const h = Math.max((d[valueKey] / max) * 100, d[valueKey] > 0 ? 4 : 1);
        return (
          <div
            key={d.date}
            title={`${d.date}: ${d[valueKey]} ${valueKey === "credits" ? "credits" : "generations"}`}
            style={{ height: `${h}%` }}
            className="flex-1 cursor-pointer rounded-sm bg-accent/30 transition hover:bg-accent/70"
          />
        );
      })}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-[var(--radius-xl)] px-5 py-4 ring-1",
      accent ? "bg-accent/8 ring-accent/20" : "bg-surface ring-border",
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("size-4", accent ? "text-accent" : "text-muted-foreground")} strokeWidth={1.75} />
        <span className="text-[12px] text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-[22px] font-semibold tracking-tight", accent ? "text-accent" : "text-foreground")}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function AnalyticsView() {
  const { remaining } = useCreditsStore();
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/analytics")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
        <BarChart2 className="size-8 text-muted-foreground/30" strokeWidth={1.25} />
        <p className="text-[13px] text-muted-foreground">Unable to load analytics</p>
        <button onClick={() => window.location.reload()} className="text-[12px] text-accent hover:underline underline-offset-2">
          Retry
        </button>
      </div>
    );
  }

  const modelEntries = Object.entries(data.model_breakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const totalModelCredits = modelEntries.reduce((s, [, v]) => s + v, 0) || 1;

  const MODEL_COLORS = [
    "bg-accent", "bg-violet-500", "bg-cyan-500", "bg-amber-500", "bg-pink-500",
  ];

  return (
    <motion.div
      variants={variants.staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-10"
    >
      {/* Stats grid */}
      <motion.div variants={variants.fadeUp} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Zap} label="Credits used" value={data.totals.credits_used.toLocaleString()} sub="Last 30 days" accent />
        <StatCard icon={Cpu} label="Generations" value={data.totals.generations.toLocaleString()} sub="AI messages sent" />
        <StatCard icon={Rocket} label="Deployments" value={data.totals.deployments.toLocaleString()} sub="Environments pushed" />
        <StatCard icon={Upload} label="Uploads" value={data.totals.uploads.toLocaleString()} sub="Media assets" />
      </motion.div>

      {/* Credits over time */}
      <motion.div variants={variants.fadeUp} className="rounded-[var(--radius-xl)] bg-surface p-5 ring-1 ring-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[14px] font-semibold text-foreground">Credits used — last 30 days</h3>
            <p className="text-[12px] text-muted-foreground">Daily credit consumption</p>
          </div>
          <span className="text-[13px] font-semibold tabular-nums text-accent">
            {data.totals.credits_used.toLocaleString()}
          </span>
        </div>
        <MiniBarChart data={data.daily} valueKey="credits" />
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
          <span>{data.daily[0]?.date?.slice(5) ?? ""}</span>
          <span>{data.daily[data.daily.length - 1]?.date?.slice(5) ?? ""}</span>
        </div>
      </motion.div>

      {/* Model breakdown */}
      {modelEntries.length > 0 && (
        <motion.div variants={variants.fadeUp} className="rounded-[var(--radius-xl)] bg-surface p-5 ring-1 ring-border">
          <h3 className="mb-4 text-[14px] font-semibold text-foreground">Credits by model</h3>
          <div className="space-y-3">
            {modelEntries.map(([model, credits], i) => (
              <div key={model}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12.5px] font-medium text-foreground">{model}</span>
                  <span className="text-[12px] tabular-nums text-muted-foreground">
                    {credits.toLocaleString()} credits
                    <span className="ml-1 text-muted-foreground/60">
                      ({Math.round((credits / totalModelCredits) * 100)}%)
                    </span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", MODEL_COLORS[i])}
                    style={{ width: `${(credits / totalModelCredits) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Generations over time */}
      {data.totals.generations > 0 && (
        <motion.div variants={variants.fadeUp} className="rounded-[var(--radius-xl)] bg-surface p-5 ring-1 ring-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">AI generations — last 30 days</h3>
              <p className="text-[12px] text-muted-foreground">Messages and generations sent</p>
            </div>
            <span className="text-[13px] font-semibold tabular-nums text-foreground">
              {data.totals.generations.toLocaleString()}
            </span>
          </div>
          <MiniBarChart data={data.daily} valueKey="generations" />
        </motion.div>
      )}

      {data.totals.generations === 0 && data.totals.credits_used === 0 && (
        <motion.div variants={variants.fadeUp} className="flex flex-col items-center py-10 text-center">
          <BarChart2 className="mb-3 size-10 text-muted-foreground/20" strokeWidth={1.25} />
          <p className="text-[14px] font-medium text-foreground">No activity yet</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Start using AI Chat or building apps to see your usage here.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, GitBranch, Sparkles } from "lucide-react";
import type { AppRecord, AppStatus } from "@/config/apps";
import { cn } from "@/lib/utils";
import { transition, whileHover, whileTap } from "@/lib/motion";

function LivePulse({ status }: { status: AppStatus }) {
  if (status !== "live") {
    return (
      <span className="relative flex size-2 rounded-full bg-muted-foreground/35 ring-2 ring-surface" />
    );
  }
  return (
    <span className="relative flex size-2.5">
      <span className="absolute inline-flex size-full rounded-full bg-positive/40 opacity-60 motion-safe:animate-ping" />
      <span className="relative inline-flex size-2.5 rounded-full bg-positive shadow-[0_0_0_4px_color-mix(in_oklab,var(--positive)_18%,transparent)] ring-2 ring-surface" />
    </span>
  );
}

type AppCardProps = {
  app: AppRecord;
  layout?: "default" | "featured" | "compact";
  className?: string;
};

export function AppCard({ app, layout = "default", className }: AppCardProps) {
  const isFeatured = layout === "featured";
  const isCompact = layout === "compact";

  const previewHeight = isFeatured
    ? "min-h-[200px] sm:min-h-[240px] md:min-h-[260px]"
    : isCompact
      ? "min-h-[120px] sm:min-h-[132px]"
      : "min-h-[160px] sm:min-h-[176px]";

  return (
    <motion.article
      whileHover={whileHover.lift}
      whileTap={whileTap.press}
      transition={transition.card}
      className={cn("h-full", className)}
    >
      <Link
        href={app.href}
        className={cn(
          "group/card relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-xl)-2px)]",
          "glass-border bg-glass shadow-[var(--shadow-glass)] ring-1 ring-white/60",
          "dark:ring-white/[0.07]",
          "transition-shadow duration-300 ease-out hover:shadow-[var(--shadow-glass-hover)]",
        )}
      >
        <div
          className={cn(
            "relative isolate overflow-hidden",
            previewHeight,
            `bg-gradient-to-br ${app.preview.gradient}`,
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(255,255,255,0.75),transparent_55%)] opacity-90 dark:opacity-25" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(255,255,255,0.55),transparent_45%)] dark:bg-[linear-gradient(to_top,rgba(0,0,0,0.35),transparent_50%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.28] mix-blend-overlay dark:opacity-[0.18] ds-preview-grid" />

          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-surface/70 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground shadow-[var(--shadow-xs)] ring-1 ring-border/60 backdrop-blur-md dark:bg-surface/40">
            <LivePulse status={app.status} />
            <span className="capitalize text-foreground/90">{app.status}</span>
          </div>

          {isFeatured ? (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-surface/65 px-3 py-1.5 text-[12px] font-medium text-foreground/90 shadow-[var(--shadow-xs)] ring-1 ring-border/60 backdrop-blur-md dark:bg-surface/45">
                <Sparkles className="size-3.5 text-accent" strokeWidth={1.55} />
                Live preview ready
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative flex flex-1 flex-col gap-3 px-5 pb-5 pt-4">
          {app.metrics?.length ? (
            <div className="flex flex-wrap gap-2">
              {app.metrics.slice(0, isFeatured ? 3 : 2).map((m) => (
                <span
                  key={m.label}
                  className="rounded-full bg-muted/55 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground ring-1 ring-border/55"
                >
                  {m.label}: {m.value}
                </span>
              ))}
            </div>
          ) : null}

          <div>
            <h3
              className={cn(
                "font-semibold tracking-[-0.04em] text-foreground",
                isFeatured ? "text-[22px] sm:text-2xl" : "text-[17px]",
              )}
            >
              {app.name}
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground sm:text-[14px]">
              {app.tagline}
            </p>
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <p className="text-[12px] font-medium tabular-nums text-muted-foreground">
              {app.updatedLabel}
            </p>
            <div className="flex items-center gap-3">
              <span className="inline-flex max-w-[10rem] items-center gap-1.5 truncate text-[12px] font-medium text-muted-foreground">
                <GitBranch className="size-3.5 shrink-0" strokeWidth={1.65} />
                <span className="truncate">{app.branch}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[13px] font-semibold tracking-[-0.01em] text-accent transition group-hover/card:gap-1.5">
                Open
                <ArrowUpRight className="size-4" strokeWidth={1.65} />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

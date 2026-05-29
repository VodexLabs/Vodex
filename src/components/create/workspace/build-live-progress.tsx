"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DreamOS86BrandIcon } from "@/components/brand/dreamos86-brand-icon";
import type { BuildJobPollState } from "@/hooks/use-build-job-progress";
import { pickEphemeralMicroStep } from "@/lib/build/build-micro-events";

function useEphemeralMicroStep(active: boolean, editing = false) {
  const [label, setLabel] = React.useState(() => pickEphemeralMicroStep(0, editing));
  React.useEffect(() => {
    if (!active) return;
    let tick = 0;
    const id = setInterval(() => {
      tick += 1;
      setLabel(pickEphemeralMicroStep(tick, editing));
    }, 650);
    return () => clearInterval(id);
  }, [active, editing]);
  return label;
}

export function BuildLiveProgress({
  progress,
  className,
}: {
  progress: BuildJobPollState | null;
  className?: string;
}) {
  const working = Boolean(progress && !progress.done);
  const ephemeral = useEphemeralMicroStep(working && !progress?.latest?.title);

  if (!progress) return null;

  const latest = progress.latest;
  const recent = progress.events.slice(-8);
  const failed = progress.done && (progress.status === "failed" || latest?.type === "failed");
  const partialDone = progress.done && latest?.type === "partial_credit_stop";
  const headline = latest?.title ?? ephemeral ?? "Building your app";

  return (
    <div className={cn("space-y-2 px-2", className)}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-2.5 py-2 ring-1",
          failed
            ? "bg-destructive/5 ring-destructive/25"
            : partialDone
              ? "bg-amber-500/5 ring-amber-500/30"
              : "bg-accent/[0.08] ring-accent/30",
        )}
      >
        {progress.done && !failed && !partialDone ? (
          <CheckCircle2 className="size-3.5 shrink-0 text-accent" strokeWidth={1.75} />
        ) : (
          <Loader2
            className={cn("size-3.5 shrink-0 animate-spin", failed ? "text-destructive" : "text-accent")}
            strokeWidth={2}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] font-semibold text-foreground">{headline}</p>
          {latest?.detail && (
            <p className="truncate text-[10.5px] text-muted-foreground">{latest.detail}</p>
          )}
          {latest?.file_path && (
            <FileActivityLine path={latest.file_path} active={!progress.done} />
          )}
        </div>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {progress.progressPercent}%
        </span>
      </div>

      {progress.reconnecting ? (
        <p className="px-1 text-[10px] text-muted-foreground">Reconnecting to build status…</p>
      ) : null}

      <ul className="max-h-40 space-y-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {recent.map((ev) => {
            const isLatest = ev.id === latest?.id;
            return (
              <motion.li
                key={ev.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1 text-[10.5px]",
                  isLatest ? "bg-surface/90 text-foreground" : "text-muted-foreground",
                )}
              >
                {isLatest ? (
                  <Loader2 className="size-3 shrink-0 animate-spin text-accent" />
                ) : (
                  <CheckCircle2 className="size-3 shrink-0 text-accent/70" />
                )}
                <span className="min-w-0 truncate">{ev.title}</span>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      {failed && progress.error && (
        <p className="rounded-lg bg-destructive/10 px-2 py-1.5 text-[10.5px] text-destructive">
          {progress.error}
        </p>
      )}
    </div>
  );
}

function FileActivityLine({ path, active }: { path: string; active: boolean }) {
  const [dots, setDots] = React.useState(1);
  React.useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setDots((d) => (d >= 3 ? 1 : d + 1)), 450);
    return () => clearInterval(t);
  }, [active]);
  const suffix = ".".repeat(dots);
  const verb = path.includes("edit") ? "editing" : "reading";
  return (
    <p className="truncate font-mono text-[10px] text-muted-foreground/90">
      {verb} {path}
      {suffix}
    </p>
  );
}

export function BuildProgressHeader({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <DreamOS86BrandIcon variant="assistant" alt="" />
      <span className="text-[12px] font-semibold text-foreground">DreamOS86</span>
      <span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-400">
        Build
      </span>
      <Loader2 className="ml-1 size-3 animate-spin text-accent" />
    </div>
  );
}

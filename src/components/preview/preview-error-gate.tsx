"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ChevronDown, Eye, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export type PreviewBlockingIssue = {
  title: string;
  summary: string;
  details?: string;
  fixHint?: string;
};

export function PreviewErrorGate({
  issue,
  onRunRepair,
  onDismiss,
  repairing,
  className,
}: {
  issue: PreviewBlockingIssue;
  onRunRepair?: () => void;
  onDismiss?: () => void;
  repairing?: boolean;
  className?: string;
}) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-red-500/[0.04] via-background to-background px-6 py-10 text-center",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:repeating-linear-gradient(135deg,rgba(239,68,68,0.15)_0,rgba(239,68,68,0.15)_1px,transparent_1px,transparent_12px)]" />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex max-w-md flex-col items-center gap-4"
      >
        <div className="flex size-16 items-center justify-center rounded-2xl bg-red-500/10 ring-2 ring-red-500/25 shadow-[0_0_40px_-8px_rgba(239,68,68,0.5)]">
          <AlertTriangle className="size-8 text-red-500" strokeWidth={1.65} />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-500/90">
            Preview blocked
          </p>
          <h3 className="mt-2 text-[17px] font-semibold tracking-tight text-foreground">{issue.title}</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{issue.summary}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-surface px-3.5 py-2 text-[12px] font-semibold text-foreground ring-1 ring-border transition hover:ring-red-500/30"
          >
            <ChevronDown className={cn("size-3.5 transition", expanded && "rotate-180")} />
            View error details
          </button>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1.5 rounded-xl bg-surface px-3.5 py-2 text-[12px] font-semibold text-muted-foreground ring-1 ring-border transition hover:text-foreground"
            >
              <Eye className="size-3.5" />
              Show draft preview
            </button>
          )}
          {onRunRepair && (
            <button
              type="button"
              disabled={repairing}
              onClick={onRunRepair}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-accent/90 disabled:opacity-60"
            >
              <Wrench className="size-3.5" />
              {repairing ? "Repairing…" : "Run auto-repair"}
            </button>
          )}
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full overflow-hidden text-left"
            >
              <div className="mt-2 rounded-xl bg-background/90 p-4 ring-1 ring-red-500/20">
                {issue.details && (
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">
                    {issue.details}
                  </pre>
                )}
                {issue.fixHint && (
                  <p className="mt-2 text-[11.5px] text-muted-foreground">
                    <span className="font-semibold text-foreground">How to fix: </span>
                    {issue.fixHint}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

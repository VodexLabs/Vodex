"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentWorkflowEvent } from "@/lib/build/workflow-stream-types";

export type BuildFileStreamPanelProps = {
  events: AgentWorkflowEvent[];
  working: boolean;
  renderFileCard: (event: AgentWorkflowEvent) => React.ReactNode;
  className?: string;
};

/** Primary build UI — live file stream (paths, deltas, in-progress rings). */
export function BuildFileStreamPanel({
  events,
  working,
  renderFileCard,
  className,
}: BuildFileStreamPanelProps) {
  if (events.length === 0 && !working) return null;

  return (
    <section
      className={cn(
        "mr-6 space-y-1.5 sm:mr-10",
        working && "sticky top-0 z-[1] rounded-2xl bg-background/85 pb-2 pt-0.5 backdrop-blur-sm",
        className,
      )}
      data-testid="build-file-stream-panel"
      aria-label="Generated files"
    >
      <div className="flex items-center gap-2 px-0.5">
        <FilePlus className="size-3.5 text-sky-600/90" strokeWidth={1.75} />
        <span className="text-[10px] font-bold uppercase tracking-wide text-sky-700/90 dark:text-sky-300/90">
          Live files
        </span>
        {events.length > 0 ? (
          <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
            {events.length} file{events.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      {events.length === 0 ? (
        <p className="px-0.5 text-[11px] text-muted-foreground">Waiting for first file…</p>
      ) : (
        <ul className="max-h-[min(52vh,22rem)] space-y-1.5 overflow-y-auto pr-0.5">
          <AnimatePresence initial={false}>
            {events.map((ev) => (
              <motion.li
                key={ev.stableKey}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {renderFileCard(ev)}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { WorkflowEvent } from "@/lib/build/build-pipeline";
import { BuilderWorkflowEvent } from "@/components/builder/BuilderWorkflowEvent";

const VISIBLE_HEAD = 6;
const VISIBLE_TAIL = 4;

export function BuilderWorkflowCard({
  events,
  title = "Build progress",
  className,
}: {
  events: WorkflowEvent[];
  title?: string;
  className?: string;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const filtered = events.filter((e) => e.type !== "thinking");
  const needsCollapse = filtered.length > VISIBLE_HEAD + VISIBLE_TAIL;
  const visible = !needsCollapse || expanded
    ? filtered
    : [...filtered.slice(0, VISIBLE_HEAD), ...filtered.slice(-VISIBLE_TAIL)];

  const hiddenCount = needsCollapse && !expanded ? filtered.length - VISIBLE_HEAD - VISIBLE_TAIL : 0;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-surface/60 ring-1 ring-border/80",
        className,
      )}
    >
      <div className="border-b border-border/60 px-3 py-2">
        <p className="text-[12px] font-semibold text-foreground">{title}</p>
      </div>
      <div className="space-y-0.5 px-2 py-2">
        {visible.map((ev, i) => (
          <BuilderWorkflowEvent
            key={`${ev.type}-${ev.at}-${i}`}
            event={ev}
            status={ev.type === "failed" ? "pending" : ev.type === "done" ? "done" : "done"}
          />
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full rounded-md py-1 text-center text-[11px] font-medium text-accent hover:bg-accent/5"
          >
            View {hiddenCount} more
          </button>
        )}
        {expanded && needsCollapse && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="w-full rounded-md py-1 text-center text-[11px] text-muted-foreground hover:text-foreground"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
}

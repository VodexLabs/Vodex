"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { WorkflowEvent } from "@/lib/build/build-pipeline";

export function BuilderWorkflowEvent({
  event,
  status = "done",
  className,
}: {
  event: Pick<WorkflowEvent, "type" | "label" | "detail">;
  status?: "pending" | "active" | "done";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg px-2 py-1.5 text-[12px]",
        status === "active" && "bg-accent/[0.06] ring-1 ring-accent/20",
        className,
      )}
    >
      {status === "done" ? (
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" strokeWidth={2} />
      ) : status === "active" ? (
        <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-accent" strokeWidth={2} />
      ) : (
        <Circle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" strokeWidth={2} />
      )}
      <div className="min-w-0">
        <p className="font-medium text-foreground/90">{event.label}</p>
        {event.detail && (
          <p className="truncate text-[11px] text-muted-foreground">{event.detail}</p>
        )}
      </div>
    </div>
  );
}

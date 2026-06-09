"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Compact heartbeat / active-work indicator — never a full narration wall. */
export function BuildActiveWorkChip({
  line,
  className,
}: {
  line: string;
  className?: string;
}) {
  if (!line.trim()) return null;
  return (
    <p
      className={cn(
        "mr-6 inline-flex max-w-[min(100%,34rem)] items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-[10.5px] text-muted-foreground sm:mr-10",
        className,
      )}
      data-testid="build-active-work-chip"
    >
      <Loader2 className="size-3 shrink-0 animate-spin opacity-70" />
      <span className="truncate">{line}</span>
    </p>
  );
}

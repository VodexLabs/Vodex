"use client";

import * as React from "react";
import { Zap, Activity, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCreditAmount } from "@/lib/credits/credit-summary";
import type { CanonicalCreditBucket } from "@/lib/credits/canonical-credits";
import { CreditsTracker } from "@/components/credits/credits-tracker";

type CreditsBalanceChipProps = {
  build: CanonicalCreditBucket;
  action: CanonicalCreditBucket;
  planId: string;
  loading?: boolean;
  className?: string;
};

/** Tiny horizontal balance summary — expands to full popover tracker on click. */
export function CreditsBalanceChip({
  build,
  action,
  planId,
  loading,
  className,
}: CreditsBalanceChipProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)} data-testid="credits-balance-chip">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted/50 px-2 py-1 text-[10px] font-medium text-muted-foreground ring-1 ring-border/60 transition hover:bg-muted/80 hover:text-foreground"
        aria-expanded={open}
        aria-label="Credit balances"
      >
        <span className="inline-flex items-center gap-0.5 tabular-nums">
          <Zap className="size-2.5 text-violet-600" strokeWidth={2} />
          {loading ? "…" : formatCreditAmount(build.available)}
        </span>
        <span className="text-border">·</span>
        <span className="inline-flex items-center gap-0.5 tabular-nums">
          <Activity className="size-2.5 text-cyan-600" strokeWidth={2} />
          {loading ? "…" : formatCreditAmount(action.available)}
        </span>
        <ChevronDown className={cn("size-2.5 opacity-60 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 z-50 mb-1.5 w-[min(100vw-2rem,280px)] rounded-xl border border-border bg-background p-2 shadow-xl ring-1 ring-border/80">
          <CreditsTracker
            build={build}
            action={action}
            planId={planId}
            loading={loading}
            variant="popover"
          />
          <p className="mt-1.5 px-1 text-[9px] leading-snug text-muted-foreground">
            Credits are charged only for completed work. Unused work is not charged.
          </p>
        </div>
      ) : null}
    </div>
  );
}

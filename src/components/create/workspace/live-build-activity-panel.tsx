"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  modelStageActivityMessages,
  pickLiveActivityLine,
  retryReasonFromMessage,
} from "@/lib/build/live-build-activity";

export function LiveBuildActivityPanel({
  active,
  startedAtMs,
  userPrompt = "",
  modelLabel,
  assistantMessage,
  expectedFiles = 40,
  expectedRoutes = 8,
  plannedRoutes = [],
  className,
}: {
  active: boolean;
  startedAtMs?: number;
  userPrompt?: string;
  modelLabel?: string | null;
  assistantMessage?: string | null;
  expectedFiles?: number;
  expectedRoutes?: number;
  plannedRoutes?: string[];
  className?: string;
}) {
  const [now, setNow] = React.useState(Date.now());
  const messages = React.useMemo(() => modelStageActivityMessages(userPrompt), [userPrompt]);
  const retryReason = assistantMessage ? retryReasonFromMessage(assistantMessage) : null;

  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1200);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;

  const elapsedMs = startedAtMs ? now - startedAtMs : 0;
  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const statusLine = retryReason ?? pickLiveActivityLine(messages, elapsedMs);

  return (
    <div
      className={cn(
        "mr-6 rounded-2xl bg-gradient-to-br from-sky-50/90 via-white to-indigo-50/60 px-3 py-3 ring-1 ring-sky-200/60 sm:mr-10",
        className,
      )}
      data-testid="live-build-activity-panel"
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold text-sky-800">
        <Loader2 className="size-3.5 animate-spin text-sky-600" />
        <span>Live build activity</span>
        {modelLabel ? (
          <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-sky-700">
            {modelLabel}
          </span>
        ) : null}
        <span className="ml-auto tabular-nums text-[10px] font-medium text-muted-foreground">{elapsedSec}s</span>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-foreground" data-testid="live-build-status-line">
        {statusLine}
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Target: {expectedFiles}+ files · {expectedRoutes}+ routes · components &amp; systems
      </p>
      {plannedRoutes.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {plannedRoutes.slice(0, 8).map((r) => (
            <span
              key={r}
              className="rounded-md bg-white/80 px-1.5 py-0.5 font-mono text-[9px] text-sky-800 ring-1 ring-sky-200/70"
            >
              {r}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CurrentWorkItem({
  label,
  detail,
  active,
}: {
  label: string;
  detail?: string;
  active?: boolean;
}) {
  if (!active) return null;
  return (
    <div className="mr-6 flex items-center gap-2 rounded-xl bg-surface/80 px-2.5 py-1.5 ring-1 ring-border/60 sm:mr-10" data-testid="current-work-item">
      <Loader2 className="size-3 animate-spin text-accent" />
      <div>
        <p className="text-[11px] font-medium text-foreground">{label}</p>
        {detail ? <p className="text-[10px] text-muted-foreground">{detail}</p> : null}
      </div>
    </div>
  );
}

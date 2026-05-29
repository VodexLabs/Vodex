"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type BuildRunSummaryVariant = "completed" | "partial" | "failed";

export function BuildRunSummaryCard({
  variant,
  appName,
  filesCount,
  pages,
  previewReady,
  publishReady,
  creditsUsed,
  completedSummary,
  remainingSummary,
  errorMessage,
  refunded,
  onContinue,
  className,
}: {
  variant: BuildRunSummaryVariant;
  appName?: string;
  filesCount?: number;
  pages?: string[];
  previewReady?: boolean;
  publishReady?: boolean;
  creditsUsed?: number;
  completedSummary?: string;
  remainingSummary?: string;
  errorMessage?: string;
  refunded?: boolean;
  onContinue?: () => void;
  className?: string;
}) {
  const partial = variant === "partial";
  const failed = variant === "failed";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-gradient-to-br from-background via-surface to-background shadow-[0_4px_16px_-4px_rgba(0,0,0,0.3)] ring-1",
        failed ? "ring-destructive/30" : partial ? "ring-amber-500/30" : "ring-accent/30",
        className,
      )}
      data-testid="build-run-summary"
      data-variant={variant}
    >
      <div
        className={cn(
          "h-[2px] w-full bg-gradient-to-r",
          failed
            ? "from-destructive/80 to-destructive/40"
            : partial
              ? "from-amber-500 via-orange-400 to-amber-600"
              : "from-violet-600 via-accent to-sky-500",
        )}
      />
      <div className="px-4 py-3.5">
        <p className="text-[13px] font-semibold text-foreground">
          {failed
            ? "Build needs attention"
            : partial
              ? "Partial build saved"
              : "Build complete"}
        </p>
        {appName ? (
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">{appName}</p>
        ) : null}

        {variant === "completed" && (
          <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            {typeof filesCount === "number" ? (
              <li>{filesCount} file{filesCount === 1 ? "" : "s"} created or updated</li>
            ) : null}
            {pages?.length ? <li>Pages: {pages.slice(0, 5).join(", ")}</li> : null}
            <li>Preview: {previewReady ? "Ready" : "Preparing"}</li>
            {publishReady != null ? (
              <li>Publish: {publishReady ? "Ready when you are" : "Finish setup in dashboard"}</li>
            ) : null}
            {completedSummary ? <li className="text-foreground/80">{completedSummary}</li> : null}
          </ul>
        )}

        {partial && (
          <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            {typeof creditsUsed === "number" ? (
              <p>
                Used {creditsUsed} Build Credit{creditsUsed === 1 ? "" : "s"} on this pass.
              </p>
            ) : null}
            {remainingSummary ? <p className="text-foreground/85">{remainingSummary}</p> : null}
          </div>
        )}

        {failed && (
          <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            {errorMessage ? <p>{errorMessage}</p> : null}
            {refunded ? <p>Credits were returned for this attempt.</p> : null}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {partial && onContinue ? (
            <button
              type="button"
              onClick={onContinue}
              className="rounded-xl bg-accent px-3 py-2 text-[11.5px] font-semibold text-white shadow-sm"
            >
              Continue build
            </button>
          ) : null}
          <Link
            href="/pricing"
            className="rounded-xl bg-surface px-3 py-2 text-[11.5px] font-medium text-foreground ring-1 ring-border"
          >
            Upgrade
          </Link>
          <Link
            href="/settings"
            className="rounded-xl bg-surface px-3 py-2 text-[11.5px] font-medium text-muted-foreground ring-1 ring-border"
          >
            Add credits
          </Link>
        </div>
      </div>
    </div>
  );
}

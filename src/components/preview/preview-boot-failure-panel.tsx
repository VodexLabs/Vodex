"use client";

import * as React from "react";
import { AlertTriangle, Copy, RefreshCw } from "lucide-react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { PreviewBootAuditSummary } from "@/lib/preview/preview-boot-audit-types";

export type PreviewBootFailurePanelProps = {
  summary: PreviewBootAuditSummary;
  iframeUrl: string | null;
  className?: string;
  onRetryLoad?: () => void;
  onDismiss?: () => void;
};

export function PreviewBootFailurePanel({
  summary,
  iframeUrl,
  className,
  onRetryLoad,
  onDismiss,
}: PreviewBootFailurePanelProps) {
  const details = React.useMemo(
    () =>
      JSON.stringify(
        {
          reason: summary.bootFailureReason,
          iframeUrl,
          loadedCount: summary.loadedCount,
          failedCount: summary.failedCount,
          cancelledOrIncompleteCount: summary.cancelledOrIncompleteCount,
          firstFailedAssetUrl: summary.firstFailedAssetUrl,
          firstRuntimeError: summary.firstRuntimeError,
          serviceWorkerCount: summary.serviceWorkerCount,
          navigations: summary.navigations,
        },
        null,
        2,
      ),
    [summary, iframeUrl],
  );

  return (
    <div
      data-testid="preview-boot-failure-panel"
      className={cn(
        "flex max-h-full w-full max-w-2xl flex-col gap-4 overflow-auto rounded-2xl bg-background p-6 shadow-xl ring-1 ring-destructive/25",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 ring-1 ring-destructive/20">
          <AlertTriangle className="size-5 text-destructive" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground">Preview failed to boot</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
            {summary.bootFailureReason ?? "The preview iframe loaded but the imported app did not start."}
          </p>
          {summary.firstFailedAssetUrl ? (
            <p className="mt-2 truncate font-mono text-[10px] text-muted-foreground" title={summary.firstFailedAssetUrl}>
              Failed asset: {summary.firstFailedAssetUrl}
            </p>
          ) : null}
          {iframeUrl ? (
            <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground/80" title={iframeUrl}>
              iframe: {iframeUrl}
            </p>
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-3 text-[10px] font-mono text-muted-foreground">
        <div>loaded: {summary.loadedCount}</div>
        <div>failed: {summary.failedCount}</div>
        <div>cancelled/incomplete: {summary.cancelledOrIncompleteCount}</div>
        <div>service workers: {summary.serviceWorkerCount ?? "—"}</div>
      </dl>

      <div className="flex flex-wrap gap-2">
        {onRetryLoad ? (
          <button
            type="button"
            onClick={onRetryLoad}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            <RefreshCw className="size-3.5" strokeWidth={2} />
            Retry load
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(details).then(
              () => toast.success("Copied boot diagnostics"),
              () => toast.error("Could not copy"),
            );
          }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold ring-1 ring-border"
        >
          <Copy className="size-3.5" strokeWidth={1.75} />
          Copy technical details
        </button>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-muted-foreground ring-1 ring-border"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import {
  AlertTriangle,
  Copy,
  Loader2,
  RefreshCw,
  Route,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { PreviewInnerRouteErrorMessage } from "@/lib/preview/preview-inner-route-types";
import type { PreviewRuntimeStatusPayload } from "@/lib/preview/preview-runtime-status";

export type PreviewInnerRouteErrorPanelProps = {
  error: PreviewInnerRouteErrorMessage;
  iframeUrl: string | null;
  artifactId: string | null;
  route: string;
  runtimeStatus?: PreviewRuntimeStatusPayload | null;
  className?: string;
  onInnerRouteRepair?: () => void;
  onClearPreviewCache?: () => void;
  onRebuildArtifact?: () => void;
  innerRouteRepairing?: boolean;
  previewRebuilding?: boolean;
};

function leakScanLabel(runtimeStatus?: PreviewRuntimeStatusPayload | null): string {
  if (!runtimeStatus) return "unknown";
  if (runtimeStatus.previewRenderable && runtimeStatus.jobStatus === "succeeded") {
    return "none";
  }
  return "unknown — run debug:preview-inner-route";
}

export function PreviewInnerRouteErrorPanel({
  error,
  iframeUrl,
  artifactId,
  route,
  runtimeStatus = null,
  className,
  onInnerRouteRepair,
  onClearPreviewCache,
  onRebuildArtifact,
  innerRouteRepairing = false,
  previewRebuilding = false,
}: PreviewInnerRouteErrorPanelProps) {
  const technicalDetails = React.useMemo(
    () =>
      JSON.stringify(
        {
          kind: error.kind,
          detectedBadInnerRoute: error.path,
          iframeUrl,
          artifactId,
          route,
          artifactRenderable: runtimeStatus?.previewRenderable ?? null,
          workerJob: runtimeStatus?.jobStatus ?? null,
          unsafeArtifactLeaks: leakScanLabel(runtimeStatus),
          details: error.details,
        },
        null,
        2,
      ),
    [error, iframeUrl, artifactId, route, runtimeStatus],
  );

  const copyDetails = () => {
    void navigator.clipboard.writeText(technicalDetails).then(
      () => toast.success("Copied technical details"),
      () => toast.error("Could not copy"),
    );
  };

  return (
    <div
      data-testid="preview-inner-route-error-panel"
      className={cn(
        "flex max-h-full w-full max-w-2xl flex-col gap-4 overflow-auto rounded-2xl bg-background p-6 shadow-xl ring-1 ring-amber-500/25",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 ring-1 ring-amber-500/25">
          <Route className="size-5 text-amber-600" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-snug text-foreground">
            {error.kind === "inner_next_route_404"
              ? "Imported app booted with stale preview route"
              : "Preview loaded, but the imported app routed to a missing page"}
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
            {error.kind === "inner_next_route_404" ? (
              <>
                Vodex loaded the preview-runtime iframe URL correctly, but the imported app still
                booted with a stale{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-foreground">
                  preview-html
                </code>{" "}
                route in its JS bundle, service worker cache, or router state.
              </>
            ) : (
              <>
                Vodex loaded the preview proxy correctly. The imported app&apos;s own router is trying to
                render{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-foreground">
                  {error.path}
                </code>{" "}
                as an internal route.
              </>
            )}
          </p>
          <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground/90">
            This usually means the ZIP app contains Next router state, <code>basePath</code>, service
            worker cache, or a hardcoded current path from build time.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-muted/40 px-3.5 py-3 ring-1 ring-border/60">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <AlertTriangle className="size-3" />
          Debug fields
        </p>
        <dl className="grid gap-1.5 font-mono text-[10.5px]">
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <dt className="text-muted-foreground">iframe URL</dt>
            <dd className="truncate text-foreground" title={iframeUrl ?? undefined}>
              {iframeUrl ?? "—"}
            </dd>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <dt className="text-muted-foreground">artifact id</dt>
            <dd className="truncate text-foreground">{artifactId ?? "—"}</dd>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <dt className="text-muted-foreground">route</dt>
            <dd className="text-foreground">{route}</dd>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <dt className="text-muted-foreground">bad inner route</dt>
            <dd className="truncate text-amber-700 dark:text-amber-400">{error.path}</dd>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <dt className="text-muted-foreground">artifact renderable</dt>
            <dd className="text-foreground">
              {runtimeStatus?.previewRenderable === true ? "true" : String(runtimeStatus?.previewRenderable ?? "—")}
            </dd>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <dt className="text-muted-foreground">worker job</dt>
            <dd className="text-foreground">{runtimeStatus?.jobStatus ?? "—"}</dd>
          </div>
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <dt className="text-muted-foreground">unsafe leaks</dt>
            <dd className="text-foreground">{leakScanLabel(runtimeStatus)}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap gap-2">
        {onInnerRouteRepair ? (
          <button
            type="button"
            data-testid="preview-inner-route-repair-btn"
            disabled={innerRouteRepairing || previewRebuilding}
            onClick={() => onInnerRouteRepair()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12px] font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
          >
            {innerRouteRepairing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Wrench className="size-3.5" strokeWidth={2} />
            )}
            {innerRouteRepairing ? "Repairing inner route…" : "Deep clean cache + rebuild artifact"}
          </button>
        ) : null}
        {onClearPreviewCache ? (
          <button
            type="button"
            onClick={() => onClearPreviewCache()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-2 text-[12px] font-semibold ring-1 ring-border transition hover:bg-muted"
          >
            <Trash2 className="size-3.5" strokeWidth={1.75} />
            Clear preview cache
          </button>
        ) : null}
        {onRebuildArtifact ? (
          <button
            type="button"
            disabled={previewRebuilding || innerRouteRepairing}
            onClick={() => onRebuildArtifact()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-2 text-[12px] font-semibold ring-1 ring-border transition hover:bg-muted disabled:opacity-50"
          >
            {previewRebuilding ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" strokeWidth={1.75} />
            )}
            Rebuild artifact
          </button>
        ) : null}
        <button
          type="button"
          onClick={copyDetails}
          className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-2 text-[12px] font-semibold ring-1 ring-border transition hover:bg-muted"
        >
          <Copy className="size-3.5" strokeWidth={1.75} />
          Copy technical details
        </button>
      </div>
    </div>
  );
}

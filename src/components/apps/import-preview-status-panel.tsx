"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

type PreviewImportStatus = {
  previewRenderable: boolean;
  previewStatus: string;
  framework: string | null;
  frameworkLabel: string | null;
  entryFile: string | null;
  blockedReason: string | null;
  legacyPlatform: string | null;
  warnings: string[];
  buildLogs: string | null;
  lastPreviewBuildAt: string | null;
  jobId: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  imported: "Files saved",
  analyzing: "Analyzing source",
  installing: "Installing dependencies",
  building: "Building preview",
  serving: "Serving preview",
  validating: "Validating render",
  ready: "Preview ready",
  failed: "Preview failed",
  queued: "Build queued",
};

export function ImportPreviewStatusPanel({ appId }: { appId: string }) {
  const [status, setStatus] = React.useState<PreviewImportStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [rebuilding, setRebuilding] = React.useState(false);
  const [logsOpen, setLogsOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/apps/${appId}/preview/status`, { cache: "no-store" });
      if (!res.ok) return;
      const j = (await res.json()) as Record<string, unknown>;
      setStatus({
        previewRenderable: Boolean(j.previewRenderable),
        previewStatus: String(j.previewStatus ?? "unknown"),
        framework: typeof j.framework === "string" ? j.framework : null,
        frameworkLabel: typeof j.frameworkLabel === "string" ? j.frameworkLabel : null,
        entryFile: typeof j.entryFile === "string" ? j.entryFile : null,
        blockedReason: typeof j.blockedReason === "string" ? j.blockedReason : null,
        legacyPlatform: typeof j.legacyPlatform === "string" ? j.legacyPlatform : null,
        warnings: Array.isArray(j.warnings) ? j.warnings.map(String) : [],
        buildLogs: typeof j.buildLogs === "string" ? j.buildLogs : null,
        lastPreviewBuildAt:
          typeof j.lastPreviewBuildAt === "string" ? j.lastPreviewBuildAt : null,
        jobId: typeof j.jobId === "string" ? j.jobId : null,
      });
    } finally {
      setLoading(false);
    }
  }, [appId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function rebuild() {
    setRebuilding(true);
    try {
      const res = await fetch(`/api/apps/${appId}/preview/build`, { method: "POST" });
      const j = (await res.json()) as { ok?: boolean; blockedReason?: string };
      if (j.ok) {
        toast.success("Preview is ready");
      } else {
        toast.error(j.blockedReason ?? "Preview build did not produce a renderable app");
      }
      await load();
    } catch {
      toast.error("Could not rebuild preview");
    } finally {
      setRebuilding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-surface px-4 py-3 ring-1 ring-border text-[13px] text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading preview status…
      </div>
    );
  }

  if (!status) return null;

  const ready = status.previewRenderable;
  const statusLabel = STATUS_LABELS[status.previewStatus] ?? status.previewStatus;

  return (
    <div className="rounded-xl bg-surface ring-1 ring-border overflow-hidden">
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3",
          ready ? "bg-positive/8" : "bg-amber-500/8",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {ready ? (
            <CheckCircle2 className="size-4 shrink-0 text-positive" />
          ) : (
            <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground">{statusLabel}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {status.frameworkLabel ?? status.framework ?? "Framework unknown"}
              {status.entryFile ? ` · ${status.entryFile}` : ""}
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5 shrink-0"
          disabled={rebuilding}
          onClick={() => void rebuild()}
        >
          {rebuilding ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Rebuild preview
        </Button>
      </div>

      <div className="grid gap-2 px-4 py-3 text-[12px] sm:grid-cols-2">
        <Row label="Build status" value={statusLabel} />
        <Row
          label="Preview"
          value={ready ? "Renderable" : status.blockedReason ?? "Not renderable"}
          warn={!ready}
        />
        {status.legacyPlatform && (
          <Row label="Legacy platform" value={status.legacyPlatform} warn />
        )}
        {status.lastPreviewBuildAt && (
          <Row label="Last build" value={new Date(status.lastPreviewBuildAt).toLocaleString()} />
        )}
      </div>

      {status.warnings.length > 0 && (
        <ul className="border-t border-border px-4 py-2 space-y-1">
          {status.warnings.map((w, i) => (
            <li key={i} className="text-[11px] text-amber-600 dark:text-amber-400">
              {w}
            </li>
          ))}
        </ul>
      )}

      {status.buildLogs && (
        <div className="border-t border-border">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setLogsOpen((o) => !o)}
          >
            Build logs
            {logsOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
          {logsOpen && (
            <pre className="max-h-48 overflow-auto border-t border-border bg-foreground/5 px-4 py-2 text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">
              {status.buildLogs}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("font-medium", warn ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>
        {value}
      </p>
    </div>
  );
}

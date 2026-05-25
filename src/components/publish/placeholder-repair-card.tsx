"use client";

import * as React from "react";
import { Loader2, FileCode, Wrench, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

export type PlaceholderFindingUi = {
  path: string;
  line: number;
  snippet: string;
  label: string;
};

export function PlaceholderRepairCard({
  projectId,
  findings,
  onRevalidate,
  onOpenFile,
  className,
}: {
  projectId: string;
  findings: PlaceholderFindingUi[];
  onRevalidate?: () => void;
  onOpenFile?: (path: string) => void;
  className?: string;
}) {
  const [repairing, setRepairing] = React.useState(false);

  async function autoFix() {
    setRepairing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/repair-placeholders`, {
        method: "POST",
        credentials: "include",
      });
      const body = (await res.json()) as {
        ok?: boolean;
        patched?: number;
        safe?: boolean;
        error?: string;
        remainingFindings?: PlaceholderFindingUi[];
      };
      if (!res.ok) throw new Error(body.error ?? "Repair failed");
      if (body.patched && body.patched > 0) {
        toast.success(`Updated ${body.patched} file${body.patched === 1 ? "" : "s"}`);
      } else {
        toast.info("No automatic fixes applied");
      }
      onRevalidate?.();
      if (body.remainingFindings?.length) {
        toast.error("Some placeholders need manual review");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not auto-fix");
    } finally {
      setRepairing(false);
    }
  }

  if (findings.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3",
        className,
      )}
      data-testid="placeholder-repair-card"
    >
      <div className="flex items-start gap-2">
        <Wrench className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground">Placeholder content found before publish</p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            Replace placeholder text with real app copy before going live.
          </p>
          <ul className="mt-2 max-h-36 space-y-1.5 overflow-y-auto">
            {findings.slice(0, 12).map((f) => (
              <li
                key={`${f.path}:${f.line}`}
                className="rounded-lg bg-background/80 px-2.5 py-1.5 text-[11px] ring-1 ring-border/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <FileCode className="size-3 shrink-0 opacity-60" />
                    {f.path}
                    <span className="font-normal text-muted-foreground">:{f.line}</span>
                  </span>
                  {onOpenFile ? (
                    <button
                      type="button"
                      onClick={() => onOpenFile(f.path)}
                      className="shrink-0 text-[10px] font-semibold text-accent hover:underline"
                    >
                      Open file
                    </button>
                  ) : null}
                </div>
                <p className="mt-0.5 line-clamp-1 text-muted-foreground">{f.snippet || f.label}</p>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={repairing} onClick={() => void autoFix()}>
              {repairing ? <Loader2 className="size-3.5 animate-spin" /> : <Wrench className="size-3.5" />}
              Auto-fix placeholders
            </Button>
            {onOpenFile && findings[0] ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => onOpenFile(findings[0]!.path)}>
                <ExternalLink className="size-3.5" />
                Open file
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

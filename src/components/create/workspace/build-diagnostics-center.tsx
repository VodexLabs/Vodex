"use client";

import * as React from "react";
import { Copy, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuildDiagnosticsPayload } from "@/lib/build/build-diagnostics";
import { buildCopyFixPrompt } from "@/lib/build/build-diagnostics";
import { isDreamosOwnerEmail } from "@/lib/admin-owner";
import { useAuthStore } from "@/lib/stores/auth-store";
import { copyTextToClipboard } from "@/lib/clipboard/copy-text";
import { toast } from "@/lib/toast";
import {
  clearRuntimeDiagnostics,
  readRuntimeDiagnostics,
} from "@/lib/dev/runtime-diagnostics";

export function BuildDiagnosticsCenter({
  open,
  onClose,
  diagnostics,
  className,
  launcherPos,
  onFetchDiagnostics,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  diagnostics: BuildDiagnosticsPayload | null;
  className?: string;
  launcherPos?: { x: number; y: number };
  onFetchDiagnostics?: () => Promise<BuildDiagnosticsPayload | null>;
  loading?: boolean;
}) {
  const email = useAuthStore((s) => s.user?.email);
  const allowed = isDreamosOwnerEmail(email);
  const [fallbackText, setFallbackText] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"build" | "runtime">("build");
  const [runtimeEntries, setRuntimeEntries] = React.useState(
    () => readRuntimeDiagnostics(),
  );
  const [copying, setCopying] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setRuntimeEntries(readRuntimeDiagnostics());
    const t = setInterval(() => setRuntimeEntries(readRuntimeDiagnostics()), 2000);
    return () => clearInterval(t);
  }, [open]);

  if (!open || !allowed) return null;

  const copyPrompt = async () => {
    setCopying(true);
    try {
      let payload = diagnostics;
      if (onFetchDiagnostics) {
        payload = await onFetchDiagnostics();
      }
      if (!payload) {
        toast.error("Diagnostics still loading — try again in a moment");
        return;
      }
      const text = buildCopyFixPrompt(payload);
      const result = await copyTextToClipboard(text);
      if (result.ok) {
        toast.success(`Copied fix prompt — ${result.chars.toLocaleString()} characters`);
        setFallbackText(null);
        return;
      }
      setFallbackText(text);
      toast.error("Clipboard blocked — select and copy the text below");
    } finally {
      setCopying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-8"
      data-testid="build-diagnostics-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="build-diagnostics-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        aria-label="Close diagnostics"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative flex max-h-[min(90vh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-amber-500/25 bg-background shadow-[0_24px_80px_-12px_rgba(0,0,0,0.45)]",
          className,
        )}
        data-testid="build-diagnostics-center"
      >
        <header className="flex items-center justify-between border-b border-border bg-gradient-to-r from-amber-500/10 via-background to-background px-5 py-4">
          <div>
            <h2 id="build-diagnostics-title" className="text-base font-semibold text-foreground">
              Diagnostics
            </h2>
            <p className="text-[11px] text-muted-foreground">Owner-only technical view</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={copying || loading}
              onClick={() => void copyPrompt()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-2 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-500/30 hover:bg-amber-500/20 disabled:opacity-50"
              data-testid="copy-full-fix-prompt"
            >
              {copying ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />}
              Copy fix prompt
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-muted"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="flex gap-1 border-b border-border px-5 pt-2">
          <button
            type="button"
            onClick={() => setTab("build")}
            className={cn(
              "rounded-t-md px-3 py-1.5 text-[11px] font-semibold",
              tab === "build" ? "bg-muted text-foreground" : "text-muted-foreground",
            )}
          >
            Build
          </button>
          <button
            type="button"
            onClick={() => setTab("runtime")}
            className={cn(
              "rounded-t-md px-3 py-1.5 text-[11px] font-semibold",
              tab === "runtime" ? "bg-muted text-foreground" : "text-muted-foreground",
            )}
          >
            Runtime
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {loading && !diagnostics ? (
            <p className="flex items-center gap-2 text-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading diagnostics…
            </p>
          ) : null}

          {fallbackText ? (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase text-amber-700">Manual copy</p>
              <textarea
                readOnly
                className="h-32 w-full resize-y rounded-md border border-border bg-background p-2 text-[10px] text-foreground"
                value={fallbackText}
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
          ) : null}

          {tab === "runtime" ? (
            <div className="space-y-2">
              <button
                type="button"
                className="mb-2 text-[10px] text-amber-600 underline"
                onClick={() => {
                  clearRuntimeDiagnostics();
                  setRuntimeEntries([]);
                }}
              >
                Clear runtime log
              </button>
              {runtimeEntries.length === 0 ? (
                <p>No runtime events yet.</p>
              ) : (
                runtimeEntries.map((e, i) => (
                  <div key={`${e.at}-${i}`} className="rounded-lg bg-muted/40 p-2">
                    <p className="font-semibold text-accent">{e.event}</p>
                    <p>{e.at}</p>
                    {e.detail ? (
                      <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(e.detail)}</pre>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          ) : diagnostics ? (
            <>
              <Section title="IDs">
                build_job_id: {diagnostics.build_job_id}
                {"\n"}project_id: {diagnostics.project_id}
                {"\n"}operation_id: {diagnostics.operation_id ?? "—"}
                {"\n"}failure_code: {diagnostics.failure_code ?? "—"}
                {launcherPos ? `\nlauncher_pos: ${launcherPos.x}, ${launcherPos.y}` : ""}
              </Section>
              <Section title="Prompt">
                {diagnostics.user_prompt ??
                  diagnostics.field_missing_notes?.user_prompt ??
                  "—"}
              </Section>
              <Section title="Mode / model">
                mode_at_submit:{" "}
                {diagnostics.mode_at_submit ??
                  diagnostics.field_missing_notes?.mode_at_submit ??
                  "—"}
                {"\n"}model: {diagnostics.model_used ?? "—"}
              </Section>
              <Section title="Credit explanation">{diagnostics.credit_explanation ?? "—"}</Section>
              <Section title="Credit accounting">
                {JSON.stringify(diagnostics.credit_accounting ?? {}, null, 2)}
              </Section>
              <Section title="Preview diagnostics">
                {JSON.stringify(diagnostics.preview_diagnostics ?? {}, null, 2)}
              </Section>
              <Section title="Thin files">
                {(diagnostics.thin_or_missing_files ?? []).join("\n") || "—"}
              </Section>
              <Section title="Failure">{diagnostics.failure_message ?? "—"}</Section>
              <Section title="Stack">{diagnostics.stack_trace ?? "—"}</Section>
              <Section title="Preview URL">{diagnostics.preview_url ?? "—"}</Section>
              <Section title="package.json">{diagnostics.package_json_excerpt ?? "—"}</Section>
              <Section title="Primary page">{diagnostics.root_page_excerpt ?? "—"}</Section>
              <Section title="Dashboard page">{diagnostics.dashboard_page_excerpt ?? "—"}</Section>
              <Section title="Files">
                {(diagnostics.generated_files ?? []).join("\n") ||
                  "(none — app_files query returned empty)"}
              </Section>
            </>
          ) : (
            <p>Build diagnostics unavailable.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-foreground">{title}</p>
      <pre className="whitespace-pre-wrap break-all rounded-lg bg-muted/40 p-2">{children}</pre>
    </div>
  );
}

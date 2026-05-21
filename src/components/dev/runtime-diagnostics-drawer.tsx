"use client";

import * as React from "react";
import { X, Copy, Trash2, Bug } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clearRuntimeDiagnostics,
  readRuntimeDiagnostics,
  type RuntimeDiagnosticEntry,
} from "@/lib/dev/runtime-diagnostics";
import { isDreamosOwnerEmail } from "@/lib/admin-owner";
import { useAuthStore } from "@/lib/stores/auth-store";
import { truncateIdentityId } from "@/lib/identity/dreamos-identity";

function IdentitySummaryStrip() {
  const [summary, setSummary] = React.useState<{
    accountId?: string;
    workspaceId?: string;
    projectRef?: string | null;
    appEnv?: string;
    ownerEmail?: string | null;
  } | null>(null);

  React.useEffect(() => {
    void fetch("/api/account/identity", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.accountId) {
          setSummary({
            accountId: json.accountId,
            workspaceId: json.workspaceId,
            ownerEmail: json.ownerEmail,
          });
        }
      })
      .catch(() => {});
    void fetch("/api/admin/runtime-diagnostics-bundle", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json) {
          setSummary((prev) => ({
            accountId: json.accountId ?? prev?.accountId,
            workspaceId: json.workspaceId ?? prev?.workspaceId,
            projectRef: json.projectRef ?? null,
            appEnv: json.appEnv,
            ownerEmail: json.ownerEmail ?? prev?.ownerEmail,
          }));
        }
      })
      .catch(() => {});
  }, []);

  if (!summary?.accountId) return null;

  return (
    <div className="border-b border-border px-4 py-2 text-[10px] text-muted-foreground space-y-1">
      <p>
        <span className="text-foreground/80">accountId</span>{" "}
        <span className="font-mono" title={summary.accountId}>
          {truncateIdentityId(summary.accountId)}
        </span>
      </p>
      <p>
        <span className="text-foreground/80">workspaceId</span>{" "}
        <span className="font-mono" title={summary.workspaceId}>
          {summary.workspaceId ? truncateIdentityId(summary.workspaceId) : "—"}
        </span>
      </p>
      {summary.projectRef ? (
        <p>
          <span className="text-foreground/80">projectRef</span> {summary.projectRef}
        </p>
      ) : null}
      {summary.appEnv ? (
        <p>
          <span className="text-foreground/80">appEnv</span> {summary.appEnv}
        </p>
      ) : null}
      {summary.ownerEmail ? (
        <p className="truncate">
          <span className="text-foreground/80">email</span> {summary.ownerEmail}
        </p>
      ) : null}
    </div>
  );
}

export function RuntimeDiagnosticsDrawer() {
  const email = useAuthStore((s) => s.profile?.email);
  const isOwner = isDreamosOwnerEmail(email);
  const [open, setOpen] = React.useState(false);
  const [entries, setEntries] = React.useState<RuntimeDiagnosticEntry[]>([]);

  const refresh = React.useCallback(() => {
    setEntries(readRuntimeDiagnostics());
  }, []);

  React.useEffect(() => {
    if (!isOwner || !open) return;
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [isOwner, open, refresh]);

  if (!isOwner) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          refresh();
        }}
        className="fixed bottom-20 right-3 z-[90] flex size-10 items-center justify-center rounded-full bg-amber-500/90 text-amber-950 shadow-lg ring-2 ring-amber-300/50 lg:bottom-6"
        title="Owner diagnostics"
        aria-label="Open runtime diagnostics"
      >
        <Bug className="size-4" strokeWidth={2} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close diagnostics"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              "relative flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl",
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-[13px] font-semibold text-foreground">Runtime diagnostics</p>
                <p className="text-[11px] text-muted-foreground">Owner only · last {entries.length} events</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface"
              >
                <X className="size-4" />
              </button>
            </div>

            <IdentitySummaryStrip />

            <div className="flex gap-2 border-b border-border px-4 py-2">
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    const local = readRuntimeDiagnostics();
                    let server: unknown = null;
                    try {
                      const r = await fetch("/api/admin/runtime-diagnostics-bundle", {
                        credentials: "include",
                      });
                      if (r.ok) server = await r.json();
                    } catch {
                      /* ignore */
                    }
                    const bundle = { client: local, server, copied_at: new Date().toISOString() };
                    await navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
                  })();
                }}
                className="flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1.5 text-[11px] font-medium ring-1 ring-border"
              >
                <Copy className="size-3.5" />
                Copy diagnostic bundle
              </button>
              <button
                type="button"
                onClick={() => {
                  clearRuntimeDiagnostics();
                  refresh();
                }}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-surface"
              >
                <Trash2 className="size-3.5" />
                Clear
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-[10.5px]">
              {entries.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No events yet.</p>
              ) : (
                entries.map((e, i) => (
                  <div
                    key={`${e.at}-${i}`}
                    className="mb-2 rounded-lg bg-surface/80 px-2.5 py-2 ring-1 ring-border/60"
                  >
                    <p className="font-semibold text-accent">{e.event}</p>
                    <p className="text-muted-foreground">{e.at}</p>
                    {e.detail && (
                      <pre className="mt-1 whitespace-pre-wrap break-all text-foreground/80">
                        {JSON.stringify(e.detail)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

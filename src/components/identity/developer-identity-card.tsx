"use client";

import * as React from "react";
import { Loader2, Code2, Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { IdentityIdRow } from "@/components/identity/identity-id-row";

type DevIdentity = {
  accountId: string;
  workspaceId: string;
  apiBaseUrl: string;
  plan: { id: string };
  apiAccessStatus: "enabled" | "disabled";
};

export function DeveloperIdentityCard({
  onIdentityLoaded,
}: {
  onIdentityLoaded?: (identity: DevIdentity) => void;
}) {
  const [data, setData] = React.useState<DevIdentity | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [copiedUrl, setCopiedUrl] = React.useState(false);

  const onLoadedRef = React.useRef(onIdentityLoaded);
  onLoadedRef.current = onIdentityLoaded;

  React.useEffect(() => {
    let cancelled = false;
    void fetch("/api/account/identity", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as DevIdentity & { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Failed");
        if (!cancelled) {
          const payload: DevIdentity = {
            accountId: json.accountId,
            workspaceId: json.workspaceId,
            apiBaseUrl: json.apiBaseUrl,
            plan: json.plan,
            apiAccessStatus: json.apiAccessStatus ?? "enabled",
          };
          setData(payload);
          onLoadedRef.current?.(payload);
        }
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function copyUrl() {
    if (!data?.apiBaseUrl) return;
    await navigator.clipboard.writeText(data.apiBaseUrl).catch(() => {});
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  const planLabel =
    data?.plan.id === "free"
      ? "Free"
      : data?.plan.id
        ? data.plan.id.charAt(0).toUpperCase() + data.plan.id.slice(1)
        : "—";

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-br from-accent/[0.08] via-background to-sky-500/[0.06] p-px shadow-[var(--shadow-card)] ring-1 ring-border/80">
      <div className="rounded-[calc(var(--radius-xl)-1px)] bg-background/95 px-4 py-5 sm:px-5">
        <div className="mb-4 flex items-center gap-2">
          <Code2 className="size-4 text-accent" strokeWidth={1.75} />
          <div>
            <p className="text-[14px] font-semibold text-foreground">Developer identity</p>
            <p className="text-[12px] text-muted-foreground">
              Include these values in API requests and integration configs.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-4 text-[13px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : data ? (
          <div className="space-y-3">
            <IdentityIdRow label="Account ID" value={data.accountId} />
            <IdentityIdRow label="Workspace ID" value={data.workspaceId} />
            <div className="flex flex-col gap-2 rounded-[var(--radius-md)] bg-muted/30 px-3 py-2.5 ring-1 ring-border/60 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                API base URL
              </span>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                <code className="min-w-0 truncate font-mono text-[11px] text-foreground sm:text-[12px]">
                  {data.apiBaseUrl}
                </code>
                <button
                  type="button"
                  onClick={() => void copyUrl()}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium ring-1",
                    copiedUrl
                      ? "bg-positive/10 text-positive ring-positive/25"
                      : "bg-background text-muted-foreground ring-border hover:text-foreground",
                  )}
                >
                  {copiedUrl ? <Check className="size-3" /> : <Copy className="size-3" />}
                  Copy
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-[12px]">
              <span className="rounded-full bg-muted/50 px-2.5 py-1 ring-1 ring-border/60">
                Plan: <strong className="text-foreground">{planLabel}</strong>
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 ring-1",
                  data.apiAccessStatus === "enabled"
                    ? "bg-positive/10 text-positive ring-positive/25"
                    : "bg-amber-500/10 text-amber-800 dark:text-amber-200 ring-amber-500/25",
                )}
              >
                API access:{" "}
                <strong>{data.apiAccessStatus === "enabled" ? "Enabled" : "Disabled"}</strong>
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">Sign in to view developer identity.</p>
        )}
      </div>
    </div>
  );
}

export function buildDreamosCurlExample(accountId: string, workspaceId: string, apiBaseUrl: string): string {
  return `curl ${apiBaseUrl}/chat \\
  -H "Authorization: Bearer sk-dream-live-YOUR_KEY" \\
  -H "X-DreamOS-Account-ID: ${accountId}" \\
  -H "X-DreamOS-Workspace-ID: ${workspaceId}" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Build a SaaS dashboard", "mode": "build"}'`;
}

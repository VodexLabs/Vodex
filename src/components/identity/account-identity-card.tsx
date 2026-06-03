"use client";

import * as React from "react";
import { Loader2, Shield } from "lucide-react";
import { SectionCard } from "@/components/settings/shared";
import { IdentityIdRow } from "@/components/identity/identity-id-row";

type IdentityPayload = {
  accountId: string;
  workspaceId: string;
  ownerEmail: string;
  plan: { id: string; interval: string };
  credits: { remaining: number; limit: number; bonus?: number };
  createdAt: string | null;
};

export function AccountIdentityCard() {
  const [data, setData] = React.useState<IdentityPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void fetch("/api/account/identity", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as IdentityPayload & { error?: string; ok?: boolean };
        if (!res.ok) throw new Error(json.error ?? "Could not load identity");
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const planLabel =
    data?.plan.id === "free"
      ? "Free"
      : data?.plan.id
        ? data.plan.id.charAt(0).toUpperCase() + data.plan.id.slice(1)
        : "—";

  return (
    <SectionCard
      title="Account identity"
      description="Stable IDs for support, API access, app ownership, and future integrations."
    >
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-[13px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-accent" />
          Loading identity…
        </div>
      ) : error ? (
        <p className="text-[13px] text-destructive">{error}</p>
      ) : data ? (
        <div className="space-y-3">
          <IdentityIdRow label="Account ID" value={data.accountId} />
          <IdentityIdRow label="Workspace ID" value={data.workspaceId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--radius-md)] bg-muted/25 px-3 py-2 ring-1 ring-border/50">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Owner email
              </p>
              <p className="mt-0.5 truncate text-[13px] font-medium text-foreground">
                {data.ownerEmail || "—"}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] bg-muted/25 px-3 py-2 ring-1 ring-border/50">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Plan
              </p>
              <p className="mt-0.5 text-[13px] font-medium capitalize text-foreground">
                {planLabel}
                {data.plan.interval ? (
                  <span className="text-muted-foreground"> · {data.plan.interval}</span>
                ) : null}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] bg-muted/25 px-3 py-2 ring-1 ring-border/50">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Credits remaining
              </p>
              <p className="mt-0.5 tabular-nums text-[13px] font-medium text-foreground">
                {data.credits.remaining.toLocaleString()}
                <span className="text-muted-foreground">
                  {" "}
                  / {data.credits.limit.toLocaleString()}
                </span>
                {(data.credits.bonus ?? 0) > 0 ? (
                  <span className="ml-1.5 text-[11px] font-semibold text-violet-600">
                    +{data.credits.bonus!.toLocaleString()} bonus
                  </span>
                ) : null}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] bg-muted/25 px-3 py-2 ring-1 ring-border/50">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Created
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-foreground">
                {data.createdAt
                  ? new Date(data.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          </div>
          <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <Shield className="mt-0.5 size-3 shrink-0 text-accent/70" strokeWidth={1.75} />
            Account ID is your login identity. Workspace ID is your space container for apps, team, and
            billing. API keys authenticate against your workspace — project GitHub/Supabase links are configured
            per app in the builder.
          </p>
        </div>
      ) : null}
    </SectionCard>
  );
}

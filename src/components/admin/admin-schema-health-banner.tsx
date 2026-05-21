"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Copy, Database, RefreshCw, Zap } from "lucide-react";
import Link from "next/link";
import { toast } from "@/lib/toast";
import type { AdminRuntimeHealth } from "@/lib/db/admin-runtime-health";

export function AdminSchemaHealthBanner() {
  const [data, setData] = React.useState<AdminRuntimeHealth | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [reloading, setReloading] = React.useState(false);

  const load = React.useCallback((refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    const q = refresh ? `?refresh=1&ts=${Date.now()}` : `?ts=${Date.now()}`;
    return fetch(`/api/admin/schema-health${q}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((json: AdminRuntimeHealth) => setData(json))
      .catch(() => setData(null))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  React.useEffect(() => {
    void load(false);
  }, [load]);

  async function copySqlFix() {
    try {
      const res = await fetch(`/api/admin/credit-billing-sql-patch?ts=${Date.now()}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Could not load SQL patch");
      const json = (await res.json()) as { sql?: string };
      const sql = json.sql?.trim() ?? "";
      if (!sql || /^run\s+supabase\//im.test(sql)) {
        toast.error("SQL patch is not executable.");
        return;
      }
      await navigator.clipboard.writeText(sql);
      toast.success("SQL copied — paste into Supabase SQL Editor and run.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Copy failed");
    }
  }

  async function verifyChargeTokens() {
    setVerifying(true);
    try {
      const res = await fetch(`/api/admin/verify-charge-tokens?ts=${Date.now()}`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as {
        callable?: boolean;
        diagnosis?: string;
        lastError?: string | null;
        chargedTest?: boolean;
        restored?: boolean;
      };
      if (json.callable) {
        toast.success(
          `charge_tokens OK${json.chargedTest ? " (test charge + restore)" : ""}${json.restored === false ? " — restore failed" : ""}`,
        );
        await load(true);
      } else {
        toast.error([json.diagnosis, json.lastError].filter(Boolean).join(" — ") || "Not callable");
        await load(true);
      }
    } finally {
      setVerifying(false);
    }
  }

  async function reloadPgrstSchema() {
    setReloading(true);
    try {
      const res = await fetch("/api/admin/reload-pgrst-schema", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; diagnosis?: string };
      if (json.ok) {
        toast.success(json.diagnosis ?? "PostgREST schema reload requested");
        await load(true);
      } else {
        toast.error(json.diagnosis ?? "Reload did not fix RPC");
        await load(true);
      }
    } finally {
      setReloading(false);
    }
  }

  if (loading && !data) {
    return <div className="h-12 animate-pulse rounded-xl bg-surface ring-1 ring-border" aria-hidden />;
  }

  if (!data) return null;

  const ct = data.rpcs.charge_tokens;

  if (data.ok) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-[12px]">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Runtime health OK</p>
          <p className="text-muted-foreground">
            {data.projectRef ? `Project ${data.projectRef}` : "Supabase"} · source={data.source} ·{" "}
            {new Date(data.checkedAt).toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground ring-1 ring-border hover:bg-background"
        >
          <RefreshCw className={cnRefresh(refreshing)} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-[12px]">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Runtime health issues detected</p>
          <p className="mt-1 text-muted-foreground">
            Last checked {new Date(data.checkedAt).toLocaleString()} · source={data.source}
            {data.projectRef ? ` · ${data.projectRef}` : ""}
          </p>
          {data.contradictions.length > 0 && (
            <p className="mt-2 text-destructive">
              Internal schema health contradiction detected — verifier bug, not database proof.
            </p>
          )}
          {data.helperRpcUnavailable && (
            <p className="mt-2 text-amber-700 dark:text-amber-300">{data.warnings[0]}</p>
          )}
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-[11px] text-muted-foreground">
            {data.missing.map((m) => (
              <li key={`${m.type}-${m.name}`}>
                {m.type === "table" ? "Table" : "RPC"}: {m.name} — {m.reason}
              </li>
            ))}
          </ul>
          <ul className="mt-2 space-y-0.5 font-mono text-[10px] text-muted-foreground">
            <li>
              charge_tokens: pg={ct.existsInPostgres ? "yes" : "no"} postgrest=
              {ct.callableByPostgrest ? "yes" : "no"} service=
              {ct.executableByServiceRole ? "yes" : "no"}
            </li>
            <li>
              profiles table visible: {data.tables.profiles.exists ? "yes" : "no"}
            </li>
          </ul>
          {ct.lastError && (
            <p className="mt-1 break-all text-[10px] text-destructive/90">Last error: {ct.lastError}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copySqlFix()}
          className="inline-flex items-center gap-1 rounded-lg bg-background px-2.5 py-1.5 text-[11px] font-medium ring-1 ring-border"
        >
          <Copy className="size-3" />
          Copy SQL patch
        </button>
        <button
          type="button"
          onClick={() => void reloadPgrstSchema()}
          disabled={reloading}
          className="inline-flex items-center gap-1 rounded-lg bg-background px-2.5 py-1.5 text-[11px] font-medium ring-1 ring-border"
        >
          <RefreshCw className={cnRefresh(reloading)} />
          Refresh schema
        </button>
        <button
          type="button"
          onClick={() => void verifyChargeTokens()}
          disabled={verifying}
          className="inline-flex items-center gap-1 rounded-lg bg-accent/10 px-2.5 py-1.5 text-[11px] font-medium text-accent ring-1 ring-accent/25"
        >
          <Zap className={cnRefresh(verifying)} />
          Verify charge_tokens
        </button>
        <button type="button" onClick={() => void load(true)} disabled={refreshing} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ring-1 ring-border">
          <RefreshCw className={cnRefresh(refreshing)} />
          Reload check
        </button>
        <Link href="/api/admin/debug-supabase-schema?refresh=1" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ring-1 ring-border">
          <Database className="size-3" />
          Debug JSON
        </Link>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Paste only copied SQL into Supabase SQL Editor. Do not paste file names or migration paths.
      </p>
    </div>
  );
}

function cnRefresh(active: boolean) {
  return `size-3.5 ${active ? "animate-spin" : ""}`;
}

"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Copy, Database, RefreshCw, Zap } from "lucide-react";
import Link from "next/link";
import { toast } from "@/lib/toast";

type SchemaHealthPayload = {
  ok: boolean;
  missing: Array<{
    table?: string;
    column?: string;
    rpc?: string;
    type: "table" | "column" | "rpc";
    hint?: string;
  }>;
  projectRef: string | null;
  checkedAt: string;
  chargeTokensRpc?: boolean;
  chargeTokensIssue?: "missing" | "stale_cache" | "param_mismatch" | "service_role" | null;
  chargeTokensProbe?: {
    postgresExists?: boolean;
    postgresCatalogReadable?: boolean;
    postgrestCallable: boolean;
    serviceRoleExecutable: boolean;
    lastError: string | null;
  };
  chargeTokensUserMessage?: string;
  chargeTokensDiagnosis?: string;
  chargeTokensNextAction?: string;
  billingTables?: {
    profiles: boolean;
    credit_events: boolean;
    token_ledger: boolean;
    ai_usage_logs: boolean;
  };
  userActionHint?: string;
};

const CACHE_KEY = "dreamos-admin-schema-health";
const CACHE_MS = 45_000;

export function AdminSchemaHealthBanner() {
  const [data, setData] = React.useState<SchemaHealthPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [reloading, setReloading] = React.useState(false);

  const load = React.useCallback((refresh = false) => {
    if (!refresh && typeof sessionStorage !== "undefined") {
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw) as { at: number; payload: SchemaHealthPayload };
          if (Date.now() - cached.at < CACHE_MS) {
            setData(cached.payload);
            setLoading(false);
            return Promise.resolve();
          }
        }
      } catch {
        /* ignore */
      }
    }

    if (refresh) setRefreshing(true);
    else setLoading(true);
    const q = refresh ? `?refresh=1&t=${Date.now()}` : "";
    return fetch(`/api/admin/schema-health${q}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((json: SchemaHealthPayload) => {
        setData(json);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), payload: json }));
        } catch {
          /* ignore */
        }
      })
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
      const res = await fetch("/api/admin/credit-billing-sql-patch", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Could not load SQL patch");
      const json = (await res.json()) as { sql?: string };
      const sql = json.sql?.trim() ?? "";
      if (!sql) throw new Error("Empty SQL patch");
      if (/^run\s+supabase\//im.test(sql) || !/\b(create|alter|grant|revoke|drop)\b/i.test(sql)) {
        toast.error("SQL patch is not executable. Use “Open full SQL instructions” instead.");
        return;
      }
      await navigator.clipboard.writeText(sql);
      toast.success(
        "SQL patch copied. Paste it into Supabase SQL Editor and run the entire file.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Copy failed");
    }
  }

  async function verifyChargeTokens() {
    setVerifying(true);
    try {
      const res = await fetch("/api/admin/debug-credit-rpc", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        diagnosis?: string;
        nextAction?: string;
        userMessage?: string;
        postgrestTest?: { error?: string | null };
        serviceRoleDryRun?: { error?: string | null };
      };
      if (json.ok) {
        toast.success(json.diagnosis ?? "charge_tokens is callable");
        await load(true);
      } else {
        const detail = [json.diagnosis, json.nextAction, json.postgrestTest?.error, json.serviceRoleDryRun?.error]
          .filter(Boolean)
          .join(" — ");
        toast.error(detail || "charge_tokens still not available");
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
      const json = (await res.json()) as {
        ok?: boolean;
        diagnosis?: string;
        nextAction?: string;
        userMessage?: string;
        reloadError?: string | null;
        hint?: string | null;
      };
      if (json.ok) {
        toast.success(json.diagnosis ?? "PostgREST schema reloaded — charge_tokens OK");
        await load(true);
      } else {
        toast.error(
          [json.diagnosis, json.nextAction, json.hint, json.reloadError].filter(Boolean).join(" — ") ||
            "Reload did not fix RPC",
        );
        await load(true);
      }
    } finally {
      setReloading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="h-12 animate-pulse rounded-xl bg-surface ring-1 ring-border" aria-hidden />
    );
  }

  if (!data) return null;

  if (data.ok) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-[12px]">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Database schema OK — credits can charge</p>
          <p className="text-muted-foreground">
            {data.projectRef ? `Project ${data.projectRef}` : "Supabase"}
            {data.chargeTokensRpc ? " · charge_tokens verified" : ""} —{" "}
            {new Date(data.checkedAt).toLocaleString()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground ring-1 ring-border hover:bg-background"
          title="Re-check schema"
        >
          <RefreshCw className={cnRefresh(refreshing)} />
        </button>
      </div>
    );
  }

  const chargeBroken = !data.chargeTokensRpc;
  const rpcOnly =
    chargeBroken &&
    data.missing.length > 0 &&
    data.missing.every((m) => m.type === "rpc" || m.rpc === "charge_tokens");
  const displayMissing = rpcOnly
    ? data.missing.filter((m) => m.type === "rpc")
    : data.missing;

  const issueMessage =
    data.chargeTokensDiagnosis ??
    data.chargeTokensUserMessage ??
    (chargeBroken
      ? "Credit billing unavailable. Please retry after maintenance."
      : "Database schema incomplete");

  return (
    <div
      className={
        chargeBroken
          ? "flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-[12px]"
          : "flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-[12px]"
      }
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={`mt-0.5 size-4 shrink-0 ${chargeBroken ? "text-destructive" : "text-amber-600"}`}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{issueMessage}</p>
          <p className="mt-1 text-muted-foreground">
            {data.userActionHint ??
              "Copy and run the SQL patch below in Supabase SQL Editor, then click Reload schema."}
            {data.projectRef ? ` (${data.projectRef})` : ""}
          </p>
          {data.billingTables && chargeBroken && (
            <ul className="mt-2 space-y-0.5 font-mono text-[10px] text-muted-foreground">
              <li>
                Tables: profiles={data.billingTables.profiles ? "yes" : "no"} credit_events=
                {data.billingTables.credit_events ? "yes" : "no"} token_ledger=
                {data.billingTables.token_ledger ? "yes" : "no"} ai_usage_logs=
                {data.billingTables.ai_usage_logs ? "yes" : "no"}
              </li>
            </ul>
          )}
          {data.chargeTokensProbe && chargeBroken && (
            <ul className="mt-2 space-y-0.5 font-mono text-[10px] text-muted-foreground">
              <li>
                pg_proc charge_tokens:{" "}
                {data.chargeTokensProbe.postgresExists
                  ? "yes"
                  : data.chargeTokensProbe.postgresCatalogReadable
                    ? "no (run Copy SQL fix)"
                    : "unverified (catalog RPC not in PostgREST cache)"}
              </li>
              <li>PostgREST callable: {data.chargeTokensProbe.postgrestCallable ? "yes" : "no"}</li>
              <li>Service role executable: {data.chargeTokensProbe.serviceRoleExecutable ? "yes" : "no"}</li>
              {data.chargeTokensProbe.lastError && (
                <li className="text-destructive/90 break-all">
                  Last error: {data.chargeTokensProbe.lastError}
                </li>
              )}
            </ul>
          )}
          {displayMissing.length > 0 && (
            <ul className="mt-2 max-h-40 overflow-y-auto space-y-1 text-muted-foreground">
              {displayMissing.map((m) => (
                <li key={`${m.type}-${m.table ?? m.rpc}-${m.column ?? ""}`} className="text-[11px]">
                  {m.type === "rpc"
                    ? `RPC: ${m.rpc}`
                    : m.type === "table"
                      ? `Table missing: ${m.table}`
                      : `${m.table}.${m.column}`}
                </li>
              ))}
            </ul>
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
          Copy SQL fix
        </button>
        <button
          type="button"
          onClick={() => void reloadPgrstSchema()}
          disabled={reloading}
          className="inline-flex items-center gap-1 rounded-lg bg-background px-2.5 py-1.5 text-[11px] font-medium ring-1 ring-border"
        >
          <RefreshCw className={cnRefresh(reloading)} />
          Reload schema
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
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ring-1 ring-border"
        >
          <RefreshCw className={cnRefresh(refreshing)} />
          Refresh check
        </button>
        <Link
          href="/api/admin/debug-credit-rpc"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ring-1 ring-border"
        >
          <Database className="size-3" />
          Debug RPC JSON
        </Link>
        <Link
          href="/api/admin/runtime-diagnostics-bundle"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground underline-offset-2 hover:underline"
        >
          Diagnostic bundle
        </Link>
      </div>
    </div>
  );
}

function cnRefresh(active: boolean) {
  return `size-3.5 ${active ? "animate-spin" : ""}`;
}

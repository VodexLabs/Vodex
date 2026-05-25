"use client";

import * as React from "react";
import { RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  markClientFetchError,
  markClientFetchSuccess,
  shouldThrottleClientFetch,
} from "@/lib/network/client-fetch-backoff";

type ProviderRow = {
  provider: string;
  configured: boolean;
  status: string;
  disabledReason?: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorClass: string | null;
  balanceApiAvailable: boolean;
  requests24h: number;
  cost24hUsd: number;
  cost7dUsd: number;
  cost30dUsd: number;
  failures24h: number;
  warnings: string[];
};

type Payload = {
  checkedAt: string;
  providers: ProviderRow[];
  note?: string;
};

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Gemini",
  xai: "xAI",
};

const STATUS_COLOR: Record<string, string> = {
  available: "text-emerald-600",
  degraded: "text-amber-600",
  quota_exhausted: "text-destructive",
  auth_error: "text-destructive",
  rate_limited: "text-amber-600",
  disabled: "text-muted-foreground",
  coming_soon: "text-muted-foreground",
};

type SmokeRoutingNotes = {
  cheapestReliableDiscuss: string | null;
  bestPlanning: string | null;
  bestHeavyImplementation: string | null;
  unavailableProviders: string[];
  modelsToAvoid: Array<{ model_id: string; reason: string }>;
  updatedAt: string;
};

type CatalogModelRow = {
  catalogModelId: string;
  name: string;
  provider: string;
  class: string;
  userVisible: boolean;
  userSelectable: boolean;
  apiModelId: string | null;
  envDisableReason: string | null;
  lastSmokeCostUsd: number | null;
  lastSmokeLatencyMs: number | null;
  recommendedUse: string | null;
  adminNote: string | null;
  routingPriority: string;
  planTiers: string[];
};

type CatalogPayload = {
  checkedAt: string;
  anthropicEnableHint: string | null;
  models: CatalogModelRow[];
  routingPreview: Array<{
    mode: string;
    selectedCatalogModelId: string;
    apiModelId: string;
    estimatedCostBucket: string;
    policyNote: string;
  }>;
  routingDisclaimer: string;
};

const CLASS_LABEL: Record<string, string> = {
  available_now: "available",
  disabled_by_env: "disabled by env",
  missing_api_key: "missing key",
  coming_soon: "coming soon",
  unsupported_hidden: "hidden",
  failed_smoke: "failed smoke",
  disabled_in_catalog: "disabled",
};

type SmokeReportPayload = {
  ok: boolean;
  routingNotes?: SmokeRoutingNotes;
  report?: {
    runAt: string;
    totalProviderSpendUsd: number;
    testedCount: number;
    rows?: Array<{
      catalog_model_id?: string;
      model_id?: string;
      api_model_id?: string | null;
      status: string;
      reason?: string | null;
      admin_note?: string | null;
      skip_or_error_reason?: string | null;
      provider_cost_usd?: number | null;
    }>;
  };
};

export function AdminProviderHealthPanel() {
  const [data, setData] = React.useState<Payload | null>(null);
  const [smoke, setSmoke] = React.useState<SmokeReportPayload | null>(null);
  const [catalog, setCatalog] = React.useState<CatalogPayload | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    const key = "admin_provider_health";
    if (shouldThrottleClientFetch(key)) return;
    setLoading(true);
    try {
      const [healthRes, smokeRes, catalogRes] = await Promise.all([
        fetch("/api/admin/provider-health", { credentials: "include", cache: "no-store" }),
        fetch("/api/admin/model-smoke-report", { credentials: "include", cache: "no-store" }),
        fetch("/api/admin/model-catalog-health", { credentials: "include", cache: "no-store" }),
      ]);
      if (healthRes.ok) {
        setData((await healthRes.json()) as Payload);
        markClientFetchSuccess(key);
      } else {
        markClientFetchError(key);
      }
      if (smokeRes.ok) {
        setSmoke((await smokeRes.json()) as SmokeReportPayload);
      } else {
        setSmoke(null);
      }
      if (catalogRes.ok) {
        setCatalog((await catalogRes.json()) as CatalogPayload);
      } else {
        setCatalog(null);
      }
    } catch {
      markClientFetchError(key);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="rounded-[var(--radius-xl)] bg-surface ring-1 ring-border overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          AI provider health (owner only)
        </p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg p-1.5 text-muted-foreground ring-1 ring-border hover:bg-background"
          title="Refresh"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
        </button>
      </div>
      <div className="divide-y divide-border">
        {loading && !data ? (
          <p className="px-4 py-6 text-center text-[11px] text-muted-foreground">Loading…</p>
        ) : null}
        {(data?.providers ?? []).map((p) => (
          <div key={p.provider} className="px-4 py-3">
            <div className="flex items-center gap-2">
              {p.status === "available" ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : p.status === "disabled" && p.disabledReason ? (
                <CheckCircle2 className="size-4 text-muted-foreground" />
              ) : (
                <AlertTriangle className="size-4 text-amber-500" />
              )}
              <span className="text-[12.5px] font-medium text-foreground">
                {PROVIDER_LABELS[p.provider] ?? p.provider}
              </span>
              <span
                className={cn(
                  "text-[10px] font-mono uppercase",
                  STATUS_COLOR[p.status] ?? "text-muted-foreground",
                )}
              >
                {p.disabledReason ? "disabled by environment" : p.status.replace(/_/g, " ")}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {p.configured ? "key configured" : "no key"}
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10.5px] text-muted-foreground sm:grid-cols-4">
              <span>24h req: {p.requests24h}</span>
              <span>24h fail: {p.failures24h}</span>
              <span>24h $: {p.cost24hUsd}</span>
              <span>7d $: {p.cost7dUsd}</span>
            </div>
            {p.disabledReason ? (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Environment: <span className="font-mono">{p.disabledReason}</span>
              </p>
            ) : null}
            {p.lastErrorClass ? (
              <p className="mt-1 text-[10px] text-destructive/90">
                Last error class: {p.lastErrorClass}
                {p.lastErrorAt ? ` · ${new Date(p.lastErrorAt).toLocaleString()}` : ""}
              </p>
            ) : null}
            {p.warnings.length > 0 ? (
              <ul className="mt-1 list-inside list-disc text-[10px] text-amber-700 dark:text-amber-400">
                {p.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
      {data?.note ? (
        <p className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">{data.note}</p>
      ) : null}
      {catalog?.anthropicEnableHint ? (
        <p className="border-t border-border px-4 py-2 text-[10px] text-amber-700 dark:text-amber-400">
          {catalog.anthropicEnableHint}
        </p>
      ) : null}
      {catalog?.models?.length ? (
        <div className="border-t border-border px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Model catalog (admin)
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-[10px]">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="py-1 pr-2">Model</th>
                  <th className="py-1 pr-2">Class</th>
                  <th className="py-1 pr-2">API</th>
                  <th className="py-1 pr-2">Smoke $</th>
                  <th className="py-1 pr-2">Latency</th>
                  <th className="py-1 pr-2">Use</th>
                  <th className="py-1 pr-2">User</th>
                  <th className="py-1">Note</th>
                </tr>
              </thead>
              <tbody>
                {catalog.models.map((m) => (
                  <tr key={m.catalogModelId} className="border-t border-border/50">
                    <td className="py-1 pr-2 font-mono">{m.catalogModelId}</td>
                    <td className="py-1 pr-2">{CLASS_LABEL[m.class] ?? m.class}</td>
                    <td className="py-1 pr-2 font-mono text-muted-foreground">{m.apiModelId ?? "—"}</td>
                    <td className="py-1 pr-2 tabular-nums">
                      {m.lastSmokeCostUsd != null ? `$${m.lastSmokeCostUsd.toFixed(6)}` : "—"}
                    </td>
                    <td className="py-1 pr-2 tabular-nums">
                      {m.lastSmokeLatencyMs != null ? `${m.lastSmokeLatencyMs}ms` : "—"}
                    </td>
                    <td className="py-1 pr-2">{m.recommendedUse ?? "—"}</td>
                    <td className="py-1 pr-2">{m.userSelectable ? "selectable" : m.userVisible ? "visible" : "hidden"}</td>
                    <td className="py-1 text-muted-foreground">
                      {m.envDisableReason ?? m.adminNote ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {catalog.routingPreview?.length ? (
            <div className="mt-3">
              <p className="text-[10px] font-medium text-foreground">Routing preview (dry-run)</p>
              <ul className="mt-1 space-y-1 text-[10px] text-muted-foreground">
                {catalog.routingPreview.map((r) => (
                  <li key={r.mode}>
                    <span className="font-mono text-foreground">{r.mode}</span> → {r.selectedCatalogModelId}{" "}
                    <span className="text-muted-foreground/80">({r.estimatedCostBucket} bucket)</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[9px] text-muted-foreground/70">{catalog.routingDisclaimer}</p>
            </div>
          ) : null}
        </div>
      ) : null}
      {smoke?.routingNotes ? (
        <div className="border-t border-border px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Model routing notes (smoke test)
          </p>
          <dl className="mt-2 space-y-1 text-[10.5px] text-muted-foreground">
            <div className="flex gap-2">
              <dt className="shrink-0 font-medium text-foreground">Discuss:</dt>
              <dd className="font-mono">{smoke.routingNotes.cheapestReliableDiscuss ?? "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="shrink-0 font-medium text-foreground">Planning:</dt>
              <dd className="font-mono">{smoke.routingNotes.bestPlanning ?? "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="shrink-0 font-medium text-foreground">Heavy build:</dt>
              <dd className="font-mono">{smoke.routingNotes.bestHeavyImplementation ?? "—"}</dd>
            </div>
            {smoke.routingNotes.unavailableProviders.length > 0 ? (
              <div className="flex gap-2">
                <dt className="shrink-0 font-medium text-amber-700 dark:text-amber-400">Unavailable:</dt>
                <dd>{smoke.routingNotes.unavailableProviders.join(", ")}</dd>
              </div>
            ) : null}
            {smoke.routingNotes.modelsToAvoid.length > 0 ? (
              <div>
                <dt className="font-medium text-destructive/90">Avoid (cost/latency):</dt>
                <ul className="mt-0.5 list-inside list-disc pl-1">
                  {smoke.routingNotes.modelsToAvoid.slice(0, 5).map((m) => (
                    <li key={m.model_id}>
                      <span className="font-mono">{m.model_id}</span> — {m.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </dl>
          <p className="mt-2 text-[10px] text-muted-foreground/70">
            From <code className="font-mono">npm run smoke:models-small</code>
            {smoke.report?.runAt ? ` · ${new Date(smoke.report.runAt).toLocaleString()}` : ""}
            {smoke.report?.totalProviderSpendUsd != null
              ? ` · $${smoke.report.totalProviderSpendUsd.toFixed(4)} provider spend`
              : ""}
          </p>
          {smoke.report?.rows?.length ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="py-1 pr-2">Model</th>
                    <th className="py-1 pr-2">API</th>
                    <th className="py-1 pr-2">Status</th>
                    <th className="py-1 pr-2">Cost</th>
                    <th className="py-1">Reason / note</th>
                  </tr>
                </thead>
                <tbody>
                  {smoke.report.rows.map((r) => (
                    <tr key={r.catalog_model_id ?? r.model_id} className="border-t border-border/50">
                      <td className="py-1 pr-2 font-mono">{r.catalog_model_id ?? r.model_id}</td>
                      <td className="py-1 pr-2 font-mono text-muted-foreground">{r.api_model_id ?? "—"}</td>
                      <td className="py-1 pr-2">{r.status}</td>
                      <td className="py-1 pr-2 tabular-nums">
                        {r.provider_cost_usd != null ? `$${r.provider_cost_usd.toFixed(6)}` : "—"}
                      </td>
                      <td className="py-1 text-muted-foreground">
                        {r.reason ?? r.admin_note ?? r.skip_or_error_reason ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          No model smoke report yet — run <code className="font-mono">npm run smoke:models-small</code> locally.
        </p>
      )}
      {data?.checkedAt ? (
        <p className="px-4 pb-2 text-right text-[10px] text-muted-foreground/60">
          {new Date(data.checkedAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}

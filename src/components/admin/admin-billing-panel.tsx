"use client";

import * as React from "react";
import { AlertCircle, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PaddleAdminConfigStatus } from "@/lib/billing/paddle-config-status";

type SubRow = {
  id: string;
  user_id: string;
  user_email: string | null;
  plan_id: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  pending_downgrade_plan: string | null;
  stripe_subscription_id_masked: string | null;
  stripe_customer_id_masked: string | null;
};

export function AdminBillingPanel() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [subscriptions, setSubscriptions] = React.useState<SubRow[]>([]);
  const [paddle, setPaddle] = React.useState<PaddleAdminConfigStatus | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      fetch("/api/admin/subscriptions", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/billing/paddle", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([subJson, paddleJson]) => {
        if (cancelled) return;
        const subs = subJson as { subscriptions?: SubRow[]; error?: string };
        if (subs.error) setError(subs.error);
        setSubscriptions(subs.subscriptions ?? []);
        setPaddle(paddleJson as PaddleAdminConfigStatus);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Network error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface/40 p-4">
        <h3 className="text-[14px] font-semibold text-foreground">DreamOS86 platform billing (Paddle)</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Subscriptions for the DreamOS86 product. Generated-app payment connectors (Stripe, etc.) are separate.
        </p>
        {paddle ? (
          <dl className="mt-4 grid gap-2 text-[12px] sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Environment</dt>
              <dd className="font-medium capitalize">{paddle.environment}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Checkout ready</dt>
              <dd className="font-medium">{paddle.checkoutReady ? "Yes" : "No"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Webhook URL</dt>
              <dd className="font-mono text-[11px] break-all">{paddle.webhookUrl}</dd>
            </div>
            {paddle.missingEnv.length > 0 ? (
              <div className="sm:col-span-2 rounded-lg bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-100">
                <p className="font-medium">Missing Paddle env</p>
                <p className="mt-1 font-mono text-[11px]">{paddle.missingEnv.join(", ")}</p>
              </div>
            ) : null}
            {paddle.recentEvents?.length ? (
              <div className="sm:col-span-2">
                <dt className="mb-1 text-muted-foreground">Recent webhook events</dt>
                <ul className="max-h-32 space-y-1 overflow-y-auto font-mono text-[10px] text-muted-foreground">
                  {paddle.recentEvents.slice(0, 8).map((e) => (
                    <li key={e.id}>
                      {e.eventType} · {e.processingStatus ?? "—"} ·{" "}
                      {new Date(e.createdAt).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="sm:col-span-2 text-[12px] text-muted-foreground">
                No Paddle webhooks recorded yet.
              </div>
            )}
          </dl>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin/billing/paddle"
            className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-medium text-white"
          >
            Paddle readiness
            <ExternalLink className="size-3" />
          </Link>
          <Link
            href="/admin/billing/paddle/test-checkout"
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-medium ring-1 ring-border"
          >
            Owner test checkout
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4">
        <p className="text-[12px] text-muted-foreground">
          <strong className="text-foreground">Generated-app payment connectors</strong> (Stripe, Lemon Squeezy,
          etc.) are configured per published app by the app owner — not here. See Integrations in each app
          dashboard.
        </p>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          <AlertCircle className="size-4" />
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl bg-surface ring-1 ring-border">
        <table className="w-full min-w-[800px] text-left text-[12px]">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5">User</th>
              <th className="px-4 py-2.5">Plan</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Period end</th>
              <th className="px-4 py-2.5">Cancel?</th>
              <th className="px-4 py-2.5">Pending downgrade</th>
              <th className="px-4 py-2.5">Billing ref</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No subscription rows yet. Rows appear after Paddle checkout webhooks apply entitlements.
                </td>
              </tr>
            ) : (
              subscriptions.map((s) => (
                <tr key={s.id} className="border-b border-border/50">
                  <td className="px-4 py-3">{s.user_email ?? s.user_id.slice(0, 8)}</td>
                  <td className="px-4 py-3 capitalize">{s.plan_id}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        s.status === "active"
                          ? "bg-positive/15 text-positive"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(s.current_period_end).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{s.cancel_at_period_end ? "Yes" : "—"}</td>
                  <td className="px-4 py-3 capitalize">{s.pending_downgrade_plan ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground">
                    {s.stripe_subscription_id_masked ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <CreditCard className="size-3.5" />
        DreamOS86 platform billing is Paddle-only. Legacy column labels may still say Stripe from older schema.
      </p>
    </div>
  );
}

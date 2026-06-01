"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { BillingTruth } from "@/lib/billing/billing-truth";

type Props = {
  truth: BillingTruth | Record<string, unknown> | null;
  userId?: string;
  className?: string;
};

function asTruth(v: Props["truth"]): BillingTruth | null {
  if (!v || typeof v !== "object") return null;
  if ("billingState" in v && "planSource" in v) return v as BillingTruth;
  return null;
}

export function BillingTruthPanel({ truth: raw, userId, className }: Props) {
  const truth = asTruth(raw);
  if (!truth) return null;

  const caseColors: Record<string, string> = {
    A: "border-amber-500/50 bg-amber-500/10",
    B: "border-emerald-500/40 bg-emerald-500/10",
    C: "border-destructive/40 bg-destructive/10",
    D: "border-border bg-muted/30",
  };

  const border = truth.billingTruthCase
    ? caseColors[truth.billingTruthCase] ?? "border-border bg-card/50"
    : "border-border bg-card/50";

  return (
    <section className={`rounded-xl border p-4 space-y-4 ${border} ${className ?? ""}`}>
      <div className="flex items-start gap-2">
        {truth.billingTruthCase === "B" ? (
          <CheckCircle2 className="size-5 shrink-0 text-emerald-400 mt-0.5" />
        ) : truth.billingTruthCase === "A" || truth.billingTruthCase === "C" ? (
          <AlertTriangle className="size-5 shrink-0 text-amber-400 mt-0.5" />
        ) : (
          <Info className="size-5 shrink-0 text-muted-foreground mt-0.5" />
        )}
        <div>
          <h2 className="text-[15px] font-semibold">Billing truth</h2>
          {truth.billingTruthCase ? (
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
              Case {truth.billingTruthCase}
            </p>
          ) : null}
          <p className="text-[13px] text-muted-foreground mt-2">{truth.billingTruthSummary}</p>
        </div>
      </div>

      {truth.visibleWarningMessage ? (
        <p className="text-[12px] font-medium text-amber-200/90 rounded-lg bg-black/20 px-3 py-2">
          {truth.visibleWarningMessage}
        </p>
      ) : null}

      <dl className="grid gap-2 text-[12px] sm:grid-cols-2">
        {userId ? (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">User ID</dt>
            <dd className="font-mono text-[11px] break-all">{userId}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted-foreground">Profile plan</dt>
          <dd className="font-medium capitalize">{truth.profilePlan}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Plan source</dt>
          <dd className="font-medium font-mono">{truth.planSource}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Billing state</dt>
          <dd className="font-medium font-mono">{truth.billingState}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Admin granted?</dt>
          <dd>{truth.isAdminGranted ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Paddle customer</dt>
          <dd className="font-mono text-[11px]">{truth.paddleCustomerId ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Paddle subscription</dt>
          <dd className="font-mono text-[11px]">{truth.paddleSubscriptionId ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Subscription status</dt>
          <dd>{truth.paddleSubscriptionStatus ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Period start</dt>
          <dd className="text-[11px]">
            {truth.currentPeriodStart
              ? new Date(truth.currentPeriodStart).toLocaleString()
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Period end / reset</dt>
          <dd className="text-[11px]">
            {truth.currentPeriodEnd ? new Date(truth.currentPeriodEnd).toLocaleString() : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Last entitlement</dt>
          <dd className="text-[11px]">
            {truth.lastEntitlementEventType ?? "—"}
            {truth.lastEntitlementEventAt
              ? ` · ${new Date(truth.lastEntitlementEventAt).toLocaleString()}`
              : ""}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Last webhook</dt>
          <dd className="text-[11px]">
            {truth.lastWebhookEventType ?? "—"}
            {truth.lastWebhookEventAt
              ? ` · ${new Date(truth.lastWebhookEventAt).toLocaleString()}`
              : ""}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Last billing attempt</dt>
          <dd className="font-mono text-[11px] break-all">{truth.lastBillingAttemptId ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Recommended action</dt>
          <dd className="font-mono">{truth.recommendedAction}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Can upgrade via subscription</dt>
          <dd>{truth.canUpgradeViaPaddleSubscription ? "Yes" : "No"}</dd>
        </div>
      </dl>
    </section>
  );
}

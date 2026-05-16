"use client";

import * as React from "react";
import Link from "next/link";
import { plans } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard, UsageBar } from "@/components/settings/shared";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  Download,
  CheckCircle2,
  ArrowUpRight,
  Zap,
  Rocket,
  AlertTriangle,
} from "lucide-react";

const currentPlan = plans.find((p) => p.id === "pro")!;

const invoices = [
  { id: "INV-2026-05", date: "May 1, 2026", amount: "$49.99", status: "paid" },
  { id: "INV-2026-04", date: "Apr 1, 2026", amount: "$49.99", status: "paid" },
  { id: "INV-2026-03", date: "Mar 1, 2026", amount: "$49.99", status: "paid" },
  { id: "INV-2026-02", date: "Feb 1, 2026", amount: "$49.99", status: "paid" },
  { id: "INV-2026-01", date: "Jan 1, 2026", amount: "$49.99", status: "paid" },
  {
    id: "INV-2025-12",
    date: "Dec 1, 2025",
    amount: "$49.99",
    status: "paid",
  },
];

export default function BillingSettingsPage() {
  const [showCancel, setShowCancel] = React.useState(false);

  return (
    <div className="space-y-5">
      {/* Current Plan */}
      <SectionCard
        title="Current Plan"
        description="Your active subscription and renewal details."
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div
            className="flex items-center justify-center size-14 rounded-[var(--radius-lg)] shrink-0 shadow-[var(--shadow-sm)]"
            style={{ background: `color-mix(in oklab, ${currentPlan.accentColor} 20%, rgba(10,10,30,1))` }}
          >
            <Zap className="size-6 text-white" strokeWidth={1.6} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-foreground">
                {currentPlan.name} Plan
              </h3>
              {currentPlan.badge && (
                <Badge variant="accent">{currentPlan.badge}</Badge>
              )}
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {currentPlan.tagline}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
              <span>
                <strong className="text-foreground">
                  ${currentPlan.monthlyPrice}
                </strong>{" "}
                / month
              </span>
              <span>
                Renews{" "}
                <strong className="text-foreground">Jun 1, 2026</strong>
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2
                  className="size-3.5 text-positive"
                  strokeWidth={2}
                />
                Active
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/pricing">
              <Button variant="accent" size="md" className="gap-1.5">
                <ArrowUpRight className="size-3.5" strokeWidth={2} />
                Upgrade
              </Button>
            </Link>
          </div>
        </div>
      </SectionCard>

      {/* Usage This Period */}
      <SectionCard title="Usage This Period" description="May 1 – May 31, 2026">
        <div className="space-y-5">
          <UsageBar
            label="AI Credits"
            used={1640}
            total={2000}
            color="bg-accent"
          />
          <UsageBar
            label="Storage"
            used={8.4}
            total={25}
            unit=" GB"
            color="bg-indigo-500"
          />
          <UsageBar
            label="Projects"
            used={12}
            total={25}
            color="bg-violet-500"
          />
        </div>
        <div className="mt-5 pt-4 border-t border-border">
          <p className="text-[12px] text-muted-foreground">
            Credits reset on{" "}
            <strong className="text-foreground">Jun 1, 2026</strong>. Unused
            credits do not roll over.
          </p>
        </div>
      </SectionCard>

      {/* Payment Method */}
      <SectionCard
        title="Payment Method"
        description="Your billing card on file."
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center size-12 rounded-[var(--radius-md)] bg-muted ring-1 ring-border shadow-[var(--shadow-xs)]">
              <CreditCard
                className="size-5 text-muted-foreground"
                strokeWidth={1.6}
              />
            </div>
            <div>
              <p className="text-[13px] font-medium text-foreground">
                Visa •••• •••• •••• 4242
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Expires 08 / 28 · Billing to San Francisco, CA
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm">
            Update card
          </Button>
        </div>
      </SectionCard>

      {/* Invoice History */}
      <SectionCard
        title="Invoice History"
        description="Your past billing records."
        noPadding
      >
        <div className="divide-y divide-border">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors duration-100"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center size-9 rounded-[var(--radius-md)] bg-muted ring-1 ring-border">
                  <Rocket
                    className="size-4 text-muted-foreground"
                    strokeWidth={1.6}
                  />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-foreground">
                    {inv.id}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {inv.date}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[13px] font-semibold text-foreground">
                  {inv.amount}
                </span>
                <Badge variant="positive">Paid</Badge>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Download className="size-3.5" strokeWidth={1.6} />
                  PDF
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Plan comparison */}
      <SectionCard
        title="Available Plans"
        description="Compare plans and upgrade or downgrade at any time."
        noPadding
      >
        <div className="divide-y divide-border">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "flex items-center justify-between gap-4 px-6 py-4 hover:bg-muted/30 transition-colors duration-100",
                plan.id === currentPlan.id && "bg-accent-muted/40",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className="size-8 rounded-full"
                  style={{ background: `color-mix(in oklab, ${plan.accentColor} 25%, rgba(10,10,30,1))` }}
                />
                <div>
                  <p className="text-[13px] font-medium text-foreground">
                    {plan.name}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    ${plan.monthlyPrice}/mo
                  </p>
                </div>
                {plan.id === currentPlan.id && (
                  <Badge variant="accent">Current</Badge>
                )}
              </div>
              <Link href="/pricing">
                <Button
                  variant={
                    plan.id === currentPlan.id ? "ghost" : "secondary"
                  }
                  size="sm"
                  disabled={plan.id === currentPlan.id}
                >
                  {plan.id === currentPlan.id
                    ? "Active"
                    : plan.monthlyPrice > currentPlan.monthlyPrice
                      ? "Upgrade"
                      : "Downgrade"}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Cancel */}
      <SectionCard
        title="Cancel Subscription"
        description="Your plan remains active until the end of the billing period."
        danger
      >
        {!showCancel ? (
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[13px] font-medium text-foreground">
                Cancel Pro plan
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                You&apos;ll keep access until Jun 1, 2026. No refunds are
                issued for partial months.
              </p>
            </div>
            <Button
              variant="outline"
              size="md"
              className="shrink-0 text-red-600 dark:text-red-400 ring-red-200/70 dark:ring-red-800/50 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => setShowCancel(true)}
            >
              Cancel subscription
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-red-100/60 dark:bg-red-950/30 px-4 py-3 ring-1 ring-red-200/60 dark:ring-red-800/40">
              <AlertTriangle
                className="size-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400"
                strokeWidth={1.6}
              />
              <p className="text-[13px] text-red-700 dark:text-red-300">
                Are you sure? You&apos;ll lose access to Pro features on Jun 1,
                2026.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setShowCancel(false)}
              >
                Keep my plan
              </Button>
              <Button
                variant="outline"
                size="md"
                className="text-red-600 dark:text-red-400 ring-red-200/70 dark:ring-red-800/50 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                Yes, cancel
              </Button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

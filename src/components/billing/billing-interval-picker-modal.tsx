"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { billablePlanDefinition, type BillablePlanId } from "@/lib/billing/billable-plans";
import { catalogAmountUsd } from "@/lib/billing/plan-billing-catalog";
import { cn } from "@/lib/utils";

type BillingIntervalPickerModalProps = {
  open: boolean;
  targetPlanId: BillablePlanId;
  onClose: () => void;
  onSelect: (interval: "monthly" | "yearly") => void;
};

export function BillingIntervalPickerModal({
  open,
  targetPlanId,
  onClose,
  onSelect,
}: BillingIntervalPickerModalProps) {
  if (!open) return null;

  const plan = billablePlanDefinition(targetPlanId);
  const monthlyUsd = catalogAmountUsd(targetPlanId, "monthly");
  const annualUsd = catalogAmountUsd(targetPlanId, "annual");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-labelledby="billing-interval-title"
        className="relative w-full max-w-lg rounded-2xl bg-background p-6 shadow-xl ring-1 ring-border"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <h2 id="billing-interval-title" className="text-lg font-semibold">
          Choose billing for {plan.label}
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Select monthly or yearly billing. You&apos;ll review the total on the next step before paying.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onSelect("monthly")}
            className={cn(
              "rounded-xl border border-border bg-surface p-4 text-left transition hover:border-accent/40 hover:ring-1 hover:ring-accent/30",
            )}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Monthly
            </p>
            <p className="mt-2 text-[22px] font-bold tabular-nums">${monthlyUsd}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">Flexible monthly billing</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/90">
              Upgrade, downgrade, or cancel anytime
            </p>
          </button>

          <button
            type="button"
            onClick={() => onSelect("yearly")}
            className={cn(
              "rounded-xl border border-accent/30 bg-accent/5 p-4 text-left transition hover:border-accent/50 hover:ring-1 hover:ring-accent/40",
            )}
          >
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-accent">
              Yearly
              <span className="rounded-full bg-positive/15 px-2 py-0.5 text-[9px] font-bold text-positive">
                Save 20%
              </span>
            </p>
            <p className="mt-2 text-[22px] font-bold tabular-nums">${annualUsd}</p>
            <p className="text-[11px] text-muted-foreground">billed annually</p>
            <p className="mt-1 text-[12px] text-muted-foreground">Best value for serious builders</p>
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

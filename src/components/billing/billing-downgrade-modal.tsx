"use client";

import * as React from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { billablePlanDefinition, type BillablePlanId } from "@/lib/billing/billable-plans";
import { PLAN_DISPLAY } from "@/lib/billing/plans";

const MIN_CANCEL_REASON = 10;

type Props = {
  open: boolean;
  onClose: () => void;
  target: BillablePlanId | "free";
  currentPlanId: string;
  renewalDate: string | null;
  onConfirm: (reason?: string) => Promise<void>;
  acting?: boolean;
};

export function BillingDowngradeModal({
  open,
  onClose,
  target,
  currentPlanId,
  renewalDate,
  onConfirm,
  acting = false,
}: Props) {
  const [reason, setReason] = React.useState("");
  const isCancel = target === "free";

  React.useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  if (!open) return null;

  const currentName = PLAN_DISPLAY[currentPlanId as keyof typeof PLAN_DISPLAY]?.name ?? currentPlanId;
  const targetLabel =
    target === "free" ? "Free" : billablePlanDefinition(target).label;
  const reasonTrimmed = reason.trim();
  const reasonValid = !isCancel || reasonTrimmed.length >= MIN_CANCEL_REASON;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal
        className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-foreground">
            {isCancel ? "Cancel subscription" : `Schedule downgrade to ${targetLabel}`}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {isCancel ? (
            <>
              Your {currentName} plan stays active until {renewalDate ?? "the end of your billing period"}. You
              will not be charged again. Free starts after your paid period ends.
            </>
          ) : (
            <>
              Your {currentName} plan stays active until {renewalDate ?? "your next renewal"}. {targetLabel}{" "}
              begins on your next renewal date.
            </>
          )}
        </p>
        {isCancel ? (
          <div className="mt-4 space-y-1.5">
            <label htmlFor="cancel-reason" className="text-[12px] font-medium text-foreground">
              Why are you leaving? <span className="text-destructive">*</span>
            </label>
            <textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Tell us what we could improve (required)"
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-[11px] text-muted-foreground">
              {reasonTrimmed.length}/{MIN_CANCEL_REASON} characters minimum
            </p>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={acting}>
            {isCancel ? "Keep plan" : "Cancel"}
          </Button>
          <Button
            type="button"
            variant={isCancel ? "destructive" : "primary"}
            disabled={acting || !reasonValid}
            onClick={() => void onConfirm(isCancel ? reasonTrimmed : undefined)}
          >
            {acting ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
            {isCancel ? "Confirm cancellation" : "Schedule downgrade"}
          </Button>
        </div>
      </div>
    </div>
  );
}

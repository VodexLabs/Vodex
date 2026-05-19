"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { X, Zap, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreditsStore } from "@/lib/stores/credits-store";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  credits: number;
  price: number;
  highlight?: boolean;
  badge?: string;
}

const UPGRADE_PLANS: Plan[] = [
  { id: "starter", name: "Starter", credits: 1_000,  price: 9 },
  { id: "pro",     name: "Pro",     credits: 10_000, price: 29, highlight: true, badge: "Most popular" },
  { id: "team",    name: "Team",    credits: 50_000, price: 99 },
];

interface CreditsUpgradeModalProps {
  onClose: () => void;
  currentPlanId?: string;
}

export function CreditsUpgradeModal({ onClose, currentPlanId = "free" }: CreditsUpgradeModalProps) {
  const { remaining, totalUsedThisPeriod } = useCreditsStore();
  const totalCredits = remaining + totalUsedThisPeriod;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg overflow-hidden rounded-[var(--radius-xl)] bg-background shadow-2xl ring-1 ring-border"
      >
        {/* Header */}
        <div className="relative flex items-start justify-between gap-3 border-b border-border px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-accent/10">
              <Zap className="size-5 text-accent" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-foreground">You&apos;re out of tokens</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Upgrade to keep building. Your progress is saved.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-surface hover:text-foreground transition"
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Usage summary */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3 ring-1 ring-border">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-muted-foreground" strokeWidth={1.75} />
              <span className="text-[12.5px] font-medium text-foreground">This period</span>
            </div>
            <div className="flex items-center gap-1.5 text-[12.5px]">
              <span className="font-semibold tabular-nums text-foreground">{totalUsedThisPeriod.toLocaleString()}</span>
              <span className="text-muted-foreground">/ {totalCredits.toLocaleString()} credits used</span>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="space-y-2.5 p-6">
          {UPGRADE_PLANS.filter((p) => p.id !== currentPlanId).map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative flex items-center gap-4 rounded-[var(--radius-xl)] p-4 ring-1 transition",
                plan.highlight
                  ? "bg-accent/6 ring-accent/30"
                  : "bg-surface ring-border hover:ring-accent/20",
              )}
            >
              {plan.badge && (
                <span className="absolute -top-2 right-4 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
                  {plan.badge}
                </span>
              )}
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <Zap className="size-5 text-accent" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-foreground">{plan.name}</p>
                <p className="text-[12px] text-muted-foreground">
                  {plan.credits.toLocaleString()} credits / month
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[14px] font-semibold text-foreground">
                  ${plan.price}<span className="text-[11px] font-normal text-muted-foreground">/mo</span>
                </span>
                <Button
                  variant={plan.highlight ? "accent" : "secondary"}
                  size="sm"
                  asChild
                  className="gap-1"
                >
                  <Link href="/pricing" onClick={onClose}>
                    Upgrade
                    <ArrowRight className="size-3.5" strokeWidth={2} />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 pb-5 pt-3 text-center">
          <p className="text-[12px] text-muted-foreground">
            Need more flexibility?{" "}
            <Link href="/pricing" onClick={onClose} className="text-accent hover:underline underline-offset-2">
              View all plans
            </Link>
            {" "}or{" "}
            <Link href="/credits" onClick={onClose} className="text-accent hover:underline underline-offset-2">
              purchase a credit pack
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

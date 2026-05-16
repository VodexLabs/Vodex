"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CreditCard, ArrowRight, ExternalLink, Loader2,
  AlertCircle, CheckCircle2, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { variants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useCreditsStore } from "@/lib/stores/credits-store";
import { createClient } from "@/lib/supabase/client";
import type { BillingEvent } from "@/lib/supabase/types";

export function BillingSettings() {
  const supabase = createClient();
  const { profile } = useAuthStore();
  const { remaining, resetAt } = useCreditsStore();
  const [events, setEvents] = React.useState<BillingEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [portalLoading, setPortalLoading] = React.useState(false);
  const [portalError, setPortalError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from("billing_events")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setEvents((data as BillingEvent[]) ?? []);
        setLoading(false);
      });
  }, [profile?.id]);

  const planName = profile?.plan_id
    ? profile.plan_id.charAt(0).toUpperCase() + profile.plan_id.slice(1)
    : "Free";
  const isActive = profile?.stripe_subscription_id !== null;

  const daysUntilReset = resetAt
    ? Math.max(0, Math.ceil((new Date(resetAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <motion.div
      variants={variants.staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Current plan */}
      <motion.div
        variants={variants.fadeUp}
        className={cn(
          "rounded-[var(--radius-xl)] p-5 ring-1",
          isActive ? "bg-accent/6 ring-accent/20" : "bg-surface ring-border",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isActive ? (
                <CheckCircle2 className="size-4 text-positive" strokeWidth={1.75} />
              ) : (
                <AlertCircle className="size-4 text-muted-foreground" strokeWidth={1.75} />
              )}
              <span className="text-[12px] font-medium text-muted-foreground">
                {isActive ? "Active subscription" : "No active subscription"}
              </span>
            </div>
            <p className="text-[18px] font-semibold text-foreground">{planName} Plan</p>
            {profile?.plan_interval && isActive && (
              <p className="mt-0.5 text-[12px] text-muted-foreground capitalize">
                Billed {profile.plan_interval}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Button variant={isActive ? "secondary" : "accent"} size="sm" asChild>
              <Link href="/pricing">
                {isActive ? "Change plan" : "Upgrade"}
                <ArrowRight className="ml-1.5 size-3.5" strokeWidth={2} />
              </Link>
            </Button>
            {!isActive && (
              <p className="text-[11px] text-positive font-medium">
                Upgrade adds credits instantly
              </p>
            )}
          </div>
        </div>

        {isActive && (
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-1.5 rounded-lg bg-background/60 px-3 py-2 text-[12px]">
              <Zap className="size-3.5 text-accent" strokeWidth={1.75} />
              <span className="font-semibold tabular-nums">{remaining.toLocaleString()}</span>
              <span className="text-muted-foreground">credits remaining</span>
            </div>
            {daysUntilReset !== null && (
              <span className="text-[12px] text-muted-foreground">
                Resets in {daysUntilReset} day{daysUntilReset !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* Stripe customer portal */}
      {isActive && (
        <motion.div variants={variants.fadeUp} className="rounded-[var(--radius-xl)] bg-surface p-5 ring-1 ring-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-foreground">Manage subscription</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Update payment method, download invoices, cancel plan.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={portalLoading}
              onClick={async () => {
                setPortalLoading(true);
                setPortalError(null);
                try {
                  const res = await fetch("/api/billing/portal", { method: "POST" });
                  const d = await res.json();
                  if (d.url) {
                    window.open(d.url, "_blank");
                  } else {
                    setPortalError(d.error ?? "Billing portal unavailable. Email support@dreamos86.com for help.");
                  }
                } catch {
                  setPortalError("Could not open billing portal. Please try again.");
                }
                setPortalLoading(false);
              }}
              className="gap-1.5 shrink-0 cursor-pointer"
            >
              {portalLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <>
                  <ExternalLink className="size-3.5" strokeWidth={1.75} />
                  Manage billing
                </>
              )}
            </Button>
          </div>
          {portalError && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-[12px] text-destructive ring-1 ring-destructive/20">
              <AlertCircle className="size-3.5 shrink-0" strokeWidth={1.75} />
              {portalError}
            </div>
          )}
        </motion.div>
      )}

      {/* Billing history */}
      <motion.div variants={variants.fadeUp} className="rounded-[var(--radius-xl)] bg-surface ring-1 ring-border">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-[14px] font-semibold text-foreground">Billing history</h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <CreditCard className="mb-2 size-8 text-muted-foreground/20" strokeWidth={1.25} />
            <p className="text-[13px] text-muted-foreground">No billing history yet</p>
            {!isActive && (
              <Button variant="accent" size="sm" asChild className="mt-4">
                <Link href="/pricing">Upgrade to get started</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {events.map((ev) => (
              <div key={ev.id} className="flex items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-foreground capitalize">
                    {ev.event_type.replace(".", " · ")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(ev.created_at).toLocaleDateString()}
                  </p>
                </div>
                {ev.amount_usd !== null && (
                  <span className="shrink-0 text-[13px] font-semibold text-foreground tabular-nums">
                    ${ev.amount_usd.toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

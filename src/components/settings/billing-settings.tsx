"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CreditCard, ArrowRight, Zap, RefreshCw, CheckCircle2, AlertCircle, Loader2,
} from "lucide-react";
import { variants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useCreditsStore } from "@/lib/stores/credits-store";
import type { BillingEvent } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";

// ─── Plan meta ────────────────────────────────────────────────────────────────

const PLAN_INFO: Record<string, { name: string; price: string; credits: string; color: string }> = {
  free:     { name: "Free",     price: "$0 / month",   credits: "100 credits / mo",    color: "text-muted-foreground bg-muted/60 ring-border" },
  starter:  { name: "Starter",  price: "$20 / month",  credits: "1,000 credits / mo",  color: "text-accent bg-accent/10 ring-accent/20" },
  pro:      { name: "Pro",      price: "$50 / month",  credits: "2,500 credits / mo",  color: "text-violet-600 bg-violet-500/10 ring-violet-500/20 dark:text-violet-400" },
  infinity: { name: "Infinity", price: "Custom",        credits: "5,000+ credits / mo", color: "text-amber-600 bg-amber-500/10 ring-amber-500/20 dark:text-amber-400" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function BillingSettings() {
  const supabase = createClient();
  const { profile } = useAuthStore();
  const { remaining, resetAt } = useCreditsStore();
  const [events, setEvents] = React.useState<BillingEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    supabase
      .from("billing_events")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setEvents((data as BillingEvent[]) ?? []);
        setLoading(false);
      }, () => {
        setEvents([]);
        setLoading(false);
      });
  }, [profile?.id]);

  const planId = profile?.plan_id ?? "free";
  const planInfo = PLAN_INFO[planId] ?? PLAN_INFO.free;

  const daysUntilReset = resetAt
    ? Math.max(0, Math.ceil((new Date(resetAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const isPaid = planId !== "free";

  return (
    <motion.div
      variants={variants.staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Current plan card */}
      <motion.div variants={variants.fadeUp}>
        <div className="rounded-[var(--radius-xl)] bg-background ring-1 ring-border overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">
                  Current plan
                </p>
                <div className="flex items-center gap-2">
                  <h2 className="text-[24px] font-bold tracking-tight text-foreground">{planInfo.name}</h2>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1", planInfo.color)}>
                    {planId === "free" ? "Free tier" : "Active"}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">{planInfo.price}</p>
              </div>
              <Link
                href="/pricing"
                className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-accent/90 shrink-0"
              >
                {planId === "free" ? "Upgrade" : "Change plan"}
                <ArrowRight className="size-3.5" strokeWidth={2.5} />
              </Link>
            </div>

            {/* Credits summary */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-surface px-4 py-3 ring-1 ring-border">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="size-3.5 text-accent" strokeWidth={2} />
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Credits remaining</p>
                </div>
                <p className="text-[22px] font-bold tracking-tight text-foreground">
                  {remaining.toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{planInfo.credits}</p>
              </div>

              <div className="rounded-xl bg-surface px-4 py-3 ring-1 ring-border">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="size-3.5 text-muted-foreground" strokeWidth={2} />
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Resets in</p>
                </div>
                <p className="text-[22px] font-bold tracking-tight text-foreground">
                  {daysUntilReset !== null ? `${daysUntilReset}d` : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {resetAt ? new Date(resetAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Monthly reset"}
                </p>
              </div>

              <div className="rounded-xl bg-surface px-4 py-3 ring-1 ring-border">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="size-3.5 text-muted-foreground" strokeWidth={2} />
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Subscription</p>
                </div>
                <p className="text-[22px] font-bold tracking-tight text-foreground">
                  {isPaid ? "Active" : "Free"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isPaid ? (profile?.stripe_subscription_id ? "Managed by Stripe" : "Active subscription") : "No payment method"}
                </p>
              </div>
            </div>
          </div>

          {/* Stripe portal or upgrade CTA */}
          {isPaid ? (
            <div className="border-t border-border bg-surface/50 px-6 py-4 flex items-center justify-between gap-4">
              <p className="text-[13px] text-muted-foreground">
                Manage payment methods, invoices, and subscription settings via the billing portal.
              </p>
              <a
                href="/api/billing/portal"
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-surface px-4 py-2 text-[12.5px] font-semibold text-foreground ring-1 ring-border transition hover:ring-accent/30"
              >
                <CreditCard className="size-3.5" strokeWidth={1.75} />
                Billing portal
              </a>
            </div>
          ) : (
            <div className="border-t border-border bg-accent/5 px-6 py-4 flex items-center justify-between gap-4">
              <p className="text-[13px] text-muted-foreground">
                Upgrade to a paid plan for more credits, premium models, and advanced features.
              </p>
              <Link
                href="/pricing"
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-accent/90"
              >
                <Zap className="size-3.5" strokeWidth={2} />
                View plans
              </Link>
            </div>
          )}
        </div>
      </motion.div>

      {/* Billing history */}
      <motion.div variants={variants.fadeUp}>
        <div className="rounded-[var(--radius-xl)] bg-background ring-1 ring-border">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-[14px] font-semibold text-foreground">Billing history</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">Recent invoices and payment records.</p>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground py-4">
                <Loader2 className="size-3.5 animate-spin" />
                Loading billing history…
              </div>
            ) : !isPaid || events.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <CreditCard className="size-8 text-muted-foreground/20 mb-2" strokeWidth={1.25} />
                <p className="text-[13px] font-medium text-foreground">
                  {!isPaid ? "No billing history yet" : "No recent invoices"}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground max-w-xs">
                  {!isPaid
                    ? "Upgrade to a paid plan to see billing history and manage your subscription."
                    : "Invoices will appear here after your first billing cycle."}
                </p>
                {!isPaid && (
                  <Link href="/pricing" className="mt-4 flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-accent/90">
                    Upgrade now <ArrowRight className="size-3" strokeWidth={2.5} />
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 ring-1 ring-border text-[12.5px]">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="size-4 text-positive shrink-0" strokeWidth={2} />
                      <div>
                        <p className="font-medium text-foreground capitalize">{ev.event_type?.replace(/_/g, " ") ?? "Payment"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(ev.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {ev.amount_usd != null && (
                        <p className="font-semibold text-foreground">${ev.amount_usd.toFixed(2)}</p>
                      )}
                      <p className="text-[11px] text-positive">succeeded</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stripe not configured notice */}
      {!isPaid && (
        <motion.div variants={variants.fadeUp}>
          <div className="rounded-[var(--radius-xl)] bg-surface ring-1 ring-border px-5 py-4 flex items-start gap-3">
            <AlertCircle className="size-4 text-muted-foreground/50 shrink-0 mt-0.5" strokeWidth={1.75} />
            <p className="text-[12.5px] text-muted-foreground">
              Real-time payments are powered by Stripe. Once configured, you&apos;ll be able to manage subscriptions, download invoices, and update payment methods directly from this page.{" "}
              <Link href="/pricing" className="text-accent underline underline-offset-2 hover:no-underline">
                View available plans →
              </Link>
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

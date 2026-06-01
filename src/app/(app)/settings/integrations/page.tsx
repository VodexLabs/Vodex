"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Layers, ArrowRight } from "lucide-react";
import { IntegrationShowcaseGrid } from "@/components/marketing/integrations-showcase";

export default function IntegrationsSettingsPage() {
  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/[0.06] via-background to-violet-500/[0.04] p-6 ring-1 ring-accent/15 sm:p-8"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 ring-1 ring-accent/25">
            <Layers className="size-6 text-accent" strokeWidth={1.65} />
          </div>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-foreground">
              Integrations are app-scoped
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              Vodex is a multi-app platform. Each app has its own integrations and secrets.
              Connect services from that app&apos;s dashboard — this page is an overview of what you can plug in.
            </p>
          </div>
        </div>
      </motion.div>

      <div>
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground/80">
          Available integrations per app
        </p>
        <IntegrationShowcaseGrid />
      </div>

      <div className="rounded-2xl border border-dashed border-border/80 bg-surface/30 p-8 text-center">
        <p className="text-[15px] font-semibold text-foreground">
          Open an app to configure its integrations
        </p>
        <p className="mx-auto mt-1 max-w-md text-[12.5px] text-muted-foreground">
          Go to your app dashboard → Integrations tab to connect services.
        </p>
        <Link
          href="/projects"
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2.5 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-accent/90"
        >
          View my apps
          <ArrowRight className="size-3.5" strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}

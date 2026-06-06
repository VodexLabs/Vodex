"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Wrench, Lock, ChevronRight, GitBranch, Database, Globe, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { isPaidPlan } from "@/lib/billing/plan-features";
import type { ProductionCertificationResult } from "@/lib/certification/types";

const FIX_ACTIONS = [
  { id: "github", label: "Connect GitHub", icon: GitBranch, section: "integrations", href: (id: string) => `/apps/${id}/builder?tab=dashboard&section=integrations` },
  { id: "supabase", label: "Connect Supabase", icon: Database, section: "integrations", href: (id: string) => `/apps/${id}/builder?tab=dashboard&section=integrations` },
  { id: "domain", label: "Configure domain", icon: Globe, section: "publish", href: (id: string) => `/apps/${id}/builder?tab=dashboard&section=domains` },
  { id: "mobile", label: "Complete mobile setup", icon: Smartphone, section: "mobile", href: (id: string) => `/apps/${id}/builder?tab=dashboard&section=mobile` },
] as const;

export function CertificationFixIssuesCenter({
  projectId,
  planId,
  result,
}: {
  projectId: string;
  planId?: string;
  result: ProductionCertificationResult | null;
}) {
  const paid = isPaidPlan(planId);
  const blockers = result?.sections.flatMap((s) =>
    s.checks.filter((c) => c.status === "blocker" || c.status === "warning").map((c) => ({ ...c, sectionId: s.id })),
  ) ?? [];

  const actions = FIX_ACTIONS.filter((a) =>
    blockers.some((b) => b.section === a.section || b.id.includes(a.id)),
  );
  const displayActions = actions.length > 0 ? actions : FIX_ACTIONS.slice(0, 3);

  return (
    <div
      className="rounded-2xl border border-border/70 bg-gradient-to-br from-violet-500/5 to-background p-4 ring-1 ring-border/50"
      data-testid="certification-fix-issues-center"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-500/25">
          <Wrench className="size-5 text-violet-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-foreground">Fix issues</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Guided repair for certification blockers — connect services and complete setup in one place.
          </p>
        </div>
      </div>

      {!paid ? (
        <div className="mt-4 rounded-xl bg-muted/40 px-4 py-3 text-center ring-1 ring-border">
          <Lock className="mx-auto size-5 text-muted-foreground" />
          <p className="mt-2 text-[12px] font-semibold">Starter+ required</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Upgrade to unlock guided certification repair.</p>
          <Link href="/pricing" className="mt-3 inline-flex rounded-lg bg-accent px-4 py-2 text-[12px] font-semibold text-white">
            View plans
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {displayActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.li
                key={action.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={action.href(projectId)}
                  className={cn(
                    "flex items-center justify-between rounded-xl bg-background/90 px-3 py-2.5 ring-1 ring-border/70 transition hover:ring-accent/35",
                  )}
                >
                  <span className="flex items-center gap-2 text-[12px] font-semibold">
                    <Icon className="size-4 text-accent" />
                    {action.label}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

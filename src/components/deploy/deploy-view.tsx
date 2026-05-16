"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Rocket, Globe, Clock, CheckCircle, AlertCircle,
  Loader, Plus, RefreshCw, ExternalLink, RotateCcw, GitBranch,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { variants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Deployment, Project } from "@/lib/supabase/types";

type DeploymentWithProject = Deployment & { projects?: Pick<Project, "name" | "gradient"> | null };

const STATUS_CONFIG = {
  queued: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted/60", label: "Queued" },
  building: { icon: Loader, color: "text-accent", bg: "bg-accent/10", label: "Building" },
  deployed: { icon: CheckCircle, color: "text-positive", bg: "bg-positive/10", label: "Deployed" },
  failed: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Failed" },
  cancelled: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted/60", label: "Cancelled" },
} as const;

export function DeployView() {
  const supabase = createClient();
  const { profile } = useAuthStore();
  const [deployments, setDeployments] = React.useState<DeploymentWithProject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [rollingBack, setRollingBack] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from("deployments")
      .select("*, projects(name, gradient)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setDeployments((data as DeploymentWithProject[]) ?? []);
        setLoading(false);
      });
  }, [profile?.id]);

  async function refresh() {
    setLoading(true);
    const { data } = await supabase
      .from("deployments")
      .select("*, projects(name, gradient)")
      .eq("user_id", profile!.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setDeployments((data as DeploymentWithProject[]) ?? []);
    setLoading(false);
  }

  async function handleRollback(dep: DeploymentWithProject) {
    if (!dep.url || dep.status !== "deployed") return;
    setRollingBack(dep.id);
    // Insert a new deployment record queued for rollback (triggers real pipeline)
    await supabase.from("deployments").insert({
      project_id: dep.project_id,
      user_id: profile!.id,
      status: "queued" as const,
      environment: dep.environment,
      commit_message: `Rollback to ${dep.commit_message ?? dep.id.slice(0, 8)}`,
      url: null,
      build_duration_ms: null,
      error_message: null,
      metadata: {},
    });
    await refresh();
    setRollingBack(null);
  }

  const active = deployments.filter((d) => d.status === "deployed" || d.status === "building");
  const queue = deployments.filter((d) => d.status === "queued" || d.status === "building");

  return (
    <div className="relative mx-auto max-w-5xl space-y-8 pb-10">
      <motion.div variants={variants.fadeUp} initial="hidden" animate="show" className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">DEPLOYMENT</p>
          <h1 className="mt-3 text-[clamp(1.75rem,3.5vw,2.4rem)] font-semibold tracking-[-0.055em] text-foreground">
            Deployment Center
          </h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            {active.length} active deployment{active.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} strokeWidth={1.75} />
          </Button>
          <Button variant="accent" size="md" asChild>
            <a href="/projects">
              <Rocket className="size-4" strokeWidth={1.75} />
              Deploy project
            </a>
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : deployments.length === 0 ? (
        <motion.div
          variants={variants.fadeUp}
          initial="hidden"
          animate="show"
          className="rounded-[var(--radius-xl)] bg-surface ring-1 ring-border px-8 py-16 text-center"
        >
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-muted/60 ring-1 ring-border">
            <Rocket className="size-8 text-muted-foreground/40" strokeWidth={1.25} />
          </div>
          <p className="text-[16px] font-semibold tracking-[-0.02em] text-foreground">No deployments yet</p>
          <p className="mt-2 max-w-[360px] mx-auto text-[13px] leading-relaxed text-muted-foreground">
            Build a project and deploy it to Vercel with one click. All environments — production, staging, and preview — are tracked here with live status.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="accent" size="md" asChild>
              <a href="/create">
                <Plus className="size-4" strokeWidth={2} /> Create your first app
              </a>
            </Button>
            <Button variant="secondary" size="md" asChild>
              <a href="/help/docs/deployment">
                <Globe className="size-4" strokeWidth={1.75} /> Deployment guide
              </a>
            </Button>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Build queue */}
          {queue.length > 0 && (
            <motion.div variants={variants.fadeUp} initial="hidden" animate="show">
              <p className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">ACTIVE BUILDS</p>
              <div className="space-y-2">
                {queue.map((dep) => {
                  const cfg = STATUS_CONFIG[dep.status];
                  return (
                    <div key={dep.id} className="flex items-center gap-4 rounded-[var(--radius-xl)] bg-surface p-4 ring-1 ring-border">
                      <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", cfg.bg)}>
                        <cfg.icon className={cn("size-4", cfg.color, dep.status === "building" && "animate-spin")} strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-foreground">{dep.projects?.name ?? "Unknown project"}</p>
                        <p className="text-[12px] text-muted-foreground capitalize">{dep.environment} · {cfg.label}</p>
                      </div>
                      <span className={cn("text-[12px] font-medium", cfg.color)}>{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* All deployments */}
          <motion.div variants={variants.fadeUp} initial="hidden" animate="show" transition={{ delay: 0.05 }}>
            <p className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">DEPLOYMENT HISTORY</p>
            <div className="space-y-2">
              {deployments.map((dep) => {
                const cfg = STATUS_CONFIG[dep.status];
                const buildSec = dep.build_duration_ms
                  ? `${(dep.build_duration_ms / 1000).toFixed(1)}s`
                  : null;

                return (
                  <div
                    key={dep.id}
                    className="flex items-center gap-4 rounded-[var(--radius-xl)] bg-surface px-5 py-4 ring-1 ring-border transition hover:ring-accent/20"
                  >
                    <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", cfg.bg)}>
                      <cfg.icon className={cn("size-4", cfg.color)} strokeWidth={1.75} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-foreground">{dep.projects?.name ?? "Unknown"}</p>
                        <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                          {dep.environment}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                        {dep.commit_message && (
                          <span className="truncate max-w-[200px]">{dep.commit_message}</span>
                        )}
                        <span>{new Date(dep.created_at).toLocaleDateString()}</span>
                        {buildSec && <span>{buildSec} build</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {dep.url && dep.status === "deployed" && (
                        <a
                          href={dep.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] text-muted-foreground transition hover:bg-surface hover:text-foreground"
                        >
                          <ExternalLink className="size-3.5" strokeWidth={1.75} />
                          Open
                        </a>
                      )}
                      {dep.status === "deployed" && (
                        <button
                          type="button"
                          onClick={() => handleRollback(dep)}
                          disabled={rollingBack === dep.id}
                          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] text-muted-foreground transition hover:bg-surface hover:text-amber-500 disabled:opacity-50"
                          title="Roll back to this deployment"
                        >
                          {rollingBack === dep.id
                            ? <Loader className="size-3.5 animate-spin" strokeWidth={1.75} />
                            : <RotateCcw className="size-3.5" strokeWidth={1.75} />}
                          Rollback
                        </button>
                      )}
                      {dep.error_message && (
                        <span
                          className="max-w-[160px] truncate rounded-lg bg-destructive/10 px-2 py-1 text-[11px] text-destructive cursor-help"
                          title={dep.error_message}
                        >
                          {dep.error_message}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

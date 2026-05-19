"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Plug } from "lucide-react";
import { variants } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Simple Icons (MIT) — static CDN SVGs, no npm dep */
const SI_V = "13";
const si = (slug: string) =>
  `https://cdn.jsdelivr.net/npm/simple-icons@${SI_V}/icons/${slug}.svg`;

export interface IntegrationShowcaseItem {
  name: string;
  desc: string;
  slug: string;
  /** Optional Tailwind classes on icon wrapper */
  iconWrap?: string;
}

/** Read-only list for marketing / settings (real connections are per-app in dashboards). */
export const INTEGRATION_SHOWCASE_ITEMS: IntegrationShowcaseItem[] = [
  { name: "Supabase", desc: "Database, Auth, Storage, Realtime", slug: "supabase", iconWrap: "bg-[#3ECF8E]/15" },
  { name: "Stripe", desc: "Payments, subscriptions, billing", slug: "stripe", iconWrap: "bg-[#635BFF]/12" },
  { name: "GitHub", desc: "Source control, CI/CD", slug: "github", iconWrap: "bg-foreground/8 dark:bg-white/10" },
  { name: "Vercel", desc: "Deployment and edge network", slug: "vercel", iconWrap: "bg-foreground/8 dark:bg-white/10" },
  { name: "Resend", desc: "Transactional email delivery", slug: "resend", iconWrap: "bg-foreground/6" },
  { name: "Slack", desc: "Notifications and webhooks", slug: "slack", iconWrap: "bg-[#4A154B]/12" },
  { name: "OpenAI", desc: "AI completions and embeddings", slug: "openai", iconWrap: "bg-[#10A37F]/12" },
];

function BrandIcon({
  name,
  slug,
  dense,
  iconWrap,
}: IntegrationShowcaseItem & { dense: boolean }) {
  const [failed, setFailed] = React.useState(false);
  const size = dense ? 28 : 40;

  if (failed) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-muted font-bold text-muted-foreground ring-1 ring-border",
          dense ? "size-7 text-[9px]" : "size-10 text-[11px]",
        )}
        aria-hidden
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl ring-1 ring-border/60 shadow-sm",
        dense ? "size-7 p-1" : "size-10 p-2",
        iconWrap ?? "bg-background",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={si(slug)}
        width={size}
        height={size}
        alt=""
        className={cn(
          "size-full object-contain",
          slug === "github" && "dark:invert",
          slug === "vercel" && "dark:invert",
          slug === "resend" && "dark:invert",
        )}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export function IntegrationShowcaseGrid({
  className = "",
  dense = false,
}: {
  className?: string;
  dense?: boolean;
}) {
  return (
    <div
      className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${className}`}
    >
      {INTEGRATION_SHOWCASE_ITEMS.map((intg, i) => (
        <motion.div
          key={intg.name}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03, duration: 0.2 }}
          className={
            dense
              ? "flex items-center gap-3 rounded-[var(--radius-lg)] bg-background px-3 py-2.5 ring-1 ring-border"
              : "group relative flex flex-col gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-surface to-background p-4 ring-1 ring-border transition hover:ring-accent/30 hover:shadow-lg"
          }
        >
          <div className="flex items-center gap-3">
            <BrandIcon {...intg} dense={dense} />
            <div className="min-w-0">
              <p className={`font-semibold text-foreground ${dense ? "text-[12.5px]" : "text-[14px]"}`}>
                {intg.name}
              </p>
              <p
                className={`text-muted-foreground ${dense ? "truncate text-[10.5px]" : "mt-0.5 text-[12px] leading-snug line-clamp-2"}`}
              >
                {intg.desc}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function IntegrationShowcaseSection({ variant = "default" }: { variant?: "default" | "premium" }) {
  const premium = variant === "premium";
  return (
    <motion.section
      variants={variants.fadeUp}
      initial="hidden"
      animate="show"
      className="mx-auto w-full max-w-5xl"
    >
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-xl ring-1 ring-accent/20",
              premium ? "bg-gradient-to-br from-accent/20 to-violet-500/15" : "bg-accent/10",
            )}
          >
            <Plug className="size-4 text-accent" strokeWidth={1.6} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Integrations</h2>
            <p className="text-[12px] text-muted-foreground">
              {premium
                ? "Drop-in adapters for data, payments, email, and AI — wire them up per app as you publish."
                : "Connect services inside each app after you create it — overview only here."}
            </p>
          </div>
        </div>
      </div>
      <div
        className={cn(
          "rounded-2xl p-4 backdrop-blur-sm sm:p-5",
          premium
            ? "border border-accent/15 bg-gradient-to-br from-accent/[0.06] via-surface/50 to-background shadow-[0_20px_50px_-24px_rgba(30,107,255,0.35)] ring-1 ring-border/80"
            : "bg-surface/40 ring-1 ring-border/80",
        )}
      >
        <IntegrationShowcaseGrid />
      </div>
    </motion.section>
  );
}

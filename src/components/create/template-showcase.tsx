"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { variants } from "@/lib/motion";

const quickStarts = [
  {
    id: "saas",
    name: "AI SaaS Platform",
    description: "Auth, dashboard, billing, API, admin panel",
    color: "from-blue-500/10 to-indigo-500/5",
    ring: "ring-blue-500/20",
    prompt: "Build a modern AI SaaS platform with user authentication, a clean dashboard, subscription billing, REST API, and an admin panel. Use Next.js, Supabase, Tailwind, and Stripe.",
  },
  {
    id: "mobile",
    name: "Mobile App Dashboard",
    description: "Analytics, live data, mobile-first UI",
    color: "from-violet-500/10 to-purple-500/5",
    ring: "ring-violet-500/20",
    prompt: "Build a mobile app dashboard with real-time analytics, responsive charts, user metrics, push notification settings, and a dark-mode-first UI. Use Next.js with Recharts and Supabase.",
  },
  {
    id: "community",
    name: "Community Platform",
    description: "Posts, comments, profiles, moderation",
    color: "from-emerald-500/10 to-teal-500/5",
    ring: "ring-emerald-500/20",
    prompt: "Build a community platform with user profiles, discussion threads, commenting system, voting, hashtags, notifications, and a moderation dashboard. Use Next.js and Supabase with full auth.",
  },
];

type TemplateShowcaseProps = {
  onUseTemplate: (seed: string) => void;
};

export function TemplateShowcase({ onUseTemplate }: TemplateShowcaseProps) {
  return (
    <section className="mx-auto mt-20 w-full max-w-5xl px-4 pb-24 sm:px-6">
      <motion.div
        variants={variants.fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10% 0px" }}
        className="mb-8 flex items-baseline justify-between"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
            Quick starts
          </p>
          <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-foreground sm:text-[24px]">
            Three production-ready starting points
          </h2>
        </div>
        <Link
          href="/templates"
          className="hidden items-center gap-1 text-[13px] font-medium text-muted-foreground transition hover:text-foreground sm:flex"
        >
          All templates
          <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
        </Link>
      </motion.div>

      <motion.div
        variants={variants.staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-10% 0px" }}
        className="grid gap-4 sm:grid-cols-3"
      >
        {quickStarts.map((t) => (
          <motion.div
            key={t.id}
            variants={variants.staggerItem}
            className={cn(
              "group overflow-hidden rounded-[var(--radius-xl)] p-[1px] ring-1 ring-border/60 transition hover:ring-border",
              "bg-gradient-to-b from-white/60 via-white/20 to-white/5",
              "dark:from-white/8 dark:via-white/[0.03] dark:to-transparent",
            )}
          >
            <div className="overflow-hidden rounded-[calc(var(--radius-xl)-1px)] bg-glass">
              {/* Color swatch */}
              <div className={cn("h-28 bg-gradient-to-br", t.color, "ring-1 ring-inset", t.ring)} />

              <div className="p-4">
                <p className="text-[14px] font-semibold tracking-[-0.025em] text-foreground">
                  {t.name}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">{t.description}</p>
                <button
                  type="button"
                  onClick={() => onUseTemplate(t.prompt)}
                  className="mt-3 inline-flex cursor-pointer items-center gap-1 text-[12.5px] font-semibold text-accent transition hover:gap-1.5 active:scale-95"
                >
                  <Sparkles className="size-3.5" strokeWidth={1.75} />
                  Start building
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-6 flex justify-center sm:hidden">
        <Link
          href="/templates"
          className="text-[13px] font-medium text-muted-foreground transition hover:text-foreground"
        >
          Browse all templates →
        </Link>
      </div>
    </section>
  );
}

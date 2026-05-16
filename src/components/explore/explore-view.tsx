"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search, ArrowUpRight, Sparkles, Zap, Smartphone,
  LayoutDashboard, ShoppingCart, Users, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { variants, whileHover, whileTap, transition } from "@/lib/motion";
import { cn } from "@/lib/utils";

// ─── Official showcase: what DreamOS86 can build ─────────────────────────────
// These are demonstrative capability examples, not fake community apps.

interface ShowcaseItem {
  id: string;
  name: string;
  tagline: string;
  category: string;
  gradient: string;
  dark: string;
  icon: React.ElementType;
  templateId: string;
}

const SHOWCASE: ShowcaseItem[] = [
  {
    id: "ai-saas",
    name: "AI SaaS Starter",
    tagline: "Full auth + billing + AI chat + credit system. Production-ready from day one.",
    category: "AI · SaaS",
    gradient: "from-blue-100/80 via-white to-indigo-100/70",
    dark: "dark:from-blue-950/40 dark:via-surface dark:to-indigo-950/30",
    icon: Sparkles,
    templateId: "ai-saas-starter",
  },
  {
    id: "mobile-twa",
    name: "Mobile TWA",
    tagline: "Web app → Play Store. Next.js + Capacitor + TWA manifest with SHA256 setup.",
    category: "Mobile · Android",
    gradient: "from-green-100/80 via-white to-emerald-100/70",
    dark: "dark:from-green-950/40 dark:via-surface dark:to-emerald-950/30",
    icon: Smartphone,
    templateId: "mobile-twa",
  },
  {
    id: "dashboard",
    name: "Analytics Dashboard",
    tagline: "Real-time charts, data tables, role-based views, and export. Supabase-backed.",
    category: "SaaS · Analytics",
    gradient: "from-cyan-100/80 via-white to-sky-100/70",
    dark: "dark:from-cyan-950/40 dark:via-surface dark:to-sky-950/30",
    icon: LayoutDashboard,
    templateId: "dashboard-starter",
  },
  {
    id: "marketplace",
    name: "Marketplace",
    tagline: "Multi-vendor with Stripe Connect, seller onboarding, reviews, and payouts.",
    category: "Commerce",
    gradient: "from-amber-100/80 via-white to-orange-100/70",
    dark: "dark:from-amber-950/40 dark:via-surface dark:to-orange-950/30",
    icon: ShoppingCart,
    templateId: "marketplace-starter",
  },
  {
    id: "community",
    name: "Community Platform",
    tagline: "Posts, DMs, reactions, moderation, real-time notifications. Supabase Realtime.",
    category: "Social",
    gradient: "from-rose-100/80 via-white to-pink-100/70",
    dark: "dark:from-rose-950/40 dark:via-surface dark:to-pink-950/30",
    icon: Users,
    templateId: "community-platform",
  },
  {
    id: "waitlist",
    name: "Landing + Waitlist",
    tagline: "Conversion-optimised launch page with email capture, countdown, and referral.",
    category: "Publishing",
    gradient: "from-indigo-100/80 via-white to-violet-100/70",
    dark: "dark:from-indigo-950/40 dark:via-surface dark:to-violet-950/30",
    icon: Globe,
    templateId: "landing-waitlist",
  },
];

const TABS = ["All", "AI", "Mobile", "SaaS", "Commerce", "Publishing"] as const;
type Tab = typeof TABS[number];

function ShowcaseCard({ item }: { item: ShowcaseItem }) {
  const Icon = item.icon;
  return (
    <motion.article whileHover={whileHover.lift} whileTap={whileTap.press} transition={transition.card}>
      <div className="group overflow-hidden rounded-[var(--radius-xl)] bg-glass shadow-[var(--shadow-glass)] ring-1 ring-white/60 dark:ring-white/[0.07] transition-shadow hover:shadow-[var(--shadow-glass-hover)]">
        <div className={cn("relative min-h-[130px] overflow-hidden", `bg-gradient-to-br ${item.gradient} ${item.dark}`)}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(255,255,255,0.7),transparent_55%)] opacity-90 dark:opacity-20" />
          <div className="pointer-events-none absolute inset-0 ds-preview-grid opacity-20" />
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-surface/70 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground ring-1 ring-border/60 backdrop-blur-md">
            <Icon className="size-2.5" strokeWidth={2} />
            {item.category}
          </div>
        </div>
        <div className="p-4">
          <h3 className="text-[15px] font-semibold tracking-[-0.03em] text-foreground">{item.name}</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{item.tagline}</p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="accent"
              size="xs"
              className="flex-1 gap-1"
              asChild
            >
              <Link href={`/marketplace?template=${item.templateId}`}>
                Use template
                <ArrowUpRight className="size-3" strokeWidth={2} />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function CommunityComingSoon() {
  return (
    <div className="mt-6 flex flex-col items-center rounded-[var(--radius-xl)] bg-surface py-16 text-center ring-1 ring-border">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20">
        <Users className="size-7 text-accent" strokeWidth={1.5} />
      </div>
      <p className="text-[15px] font-semibold text-foreground">Community builds coming soon</p>
      <p className="mt-2 max-w-sm text-[13px] text-muted-foreground">
        Apps built and published by DreamOS86 users will appear here. Build something great and be the first.
      </p>
      <Button variant="accent" size="sm" className="mt-6 gap-1.5" asChild>
        <Link href="/">
          <Zap className="size-3.5" strokeWidth={1.75} />
          Start building
        </Link>
      </Button>
    </div>
  );
}

export function ExploreView() {
  const [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState<Tab>("All");

  const filtered = SHOWCASE.filter((item) => {
    const matchTab =
      tab === "All" ||
      item.category.toLowerCase().includes(tab.toLowerCase()) ||
      item.templateId.includes(tab.toLowerCase());
    const matchSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.tagline.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <div className="relative mx-auto max-w-6xl">
      <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--accent)_8%,transparent),transparent_68%)] blur-3xl" />

      <motion.div variants={variants.fadeUp} initial="hidden" animate="show">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">EXPLORE</p>
        <h1 className="mt-3 text-balance text-[clamp(1.75rem,3.5vw,2.6rem)] font-semibold tracking-[-0.055em] text-foreground">
          Discover what&apos;s possible
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Official templates and capabilities. Pick one and ship something real.
        </p>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.55} />
            <input
              type="search"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-[var(--radius-md)] bg-surface pl-9 pr-4 text-[13px] text-foreground ring-1 ring-border focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-medium transition",
                  tab === t
                    ? "bg-foreground text-background"
                    : "bg-surface text-muted-foreground ring-1 ring-border hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Showcase grid */}
      <motion.div
        variants={variants.fadeUp}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.08 }}
        className="relative mt-10"
      >
        <p className="mb-4 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">
          OFFICIAL TEMPLATES
        </p>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <p className="text-[14px] font-medium text-foreground">No results</p>
            <p className="mt-1 text-[13px] text-muted-foreground">Try a different filter</p>
          </div>
        ) : (
          <motion.div
            variants={variants.staggerContainer}
            initial="hidden"
            animate="show"
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((item) => (
              <motion.div key={item.id} variants={variants.staggerItem}>
                <ShowcaseCard item={item} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Community builds — honest empty state */}
      <motion.div
        variants={variants.fadeUp}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.15 }}
        className="relative mt-10"
      >
        <p className="mb-4 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground">
          COMMUNITY BUILDS
        </p>
        <CommunityComingSoon />
      </motion.div>
    </div>
  );
}

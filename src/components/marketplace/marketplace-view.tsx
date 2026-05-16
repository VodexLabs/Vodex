"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Search, Star, ArrowUpRight, Sparkles,
  Smartphone, LayoutDashboard, ShoppingCart,
  MessageSquare, Zap, Globe, Users, Package,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { variants } from "@/lib/motion";
import { cn } from "@/lib/utils";

// ─── Official Templates ───────────────────────────────────────────────────────
// These are real, installable templates that DreamOS86 can scaffold via AI.

interface Template {
  id: string;
  name: string;
  description: string;
  tags: string[];
  category: string;
  frameworks: string[];
  integrations: string[];
  gradient: string;
  icon: React.ElementType;
  complexity: "Beginner" | "Intermediate" | "Advanced";
  estimatedMinutes: number;
}

const OFFICIAL_TEMPLATES: Template[] = [
  {
    id: "ai-saas-starter",
    name: "AI SaaS Starter",
    description:
      "Full-stack SaaS with Supabase auth, Stripe subscription billing, credit system, and AI chat powered by any provider.",
    tags: ["Auth", "Billing", "AI", "Credits"],
    category: "SaaS Templates",
    frameworks: ["Next.js 16", "Supabase", "Stripe"],
    integrations: ["Supabase", "Stripe", "OpenAI"],
    gradient: "from-blue-500/20 via-indigo-500/10 to-violet-500/15",
    icon: Sparkles,
    complexity: "Advanced",
    estimatedMinutes: 8,
  },
  {
    id: "mobile-twa",
    name: "Mobile TWA Starter",
    description:
      "Trusted Web Activity wrapper for Android. One codebase → Play Store. Includes Capacitor + TWA manifest + SHA256 setup.",
    tags: ["Android", "TWA", "Mobile", "Capacitor"],
    category: "Mobile Templates",
    frameworks: ["Next.js", "Capacitor", "TWA"],
    integrations: ["Play Store", "Firebase"],
    gradient: "from-green-500/20 via-emerald-500/10 to-teal-500/15",
    icon: Smartphone,
    complexity: "Intermediate",
    estimatedMinutes: 5,
  },
  {
    id: "stripe-subscription",
    name: "Stripe Subscription App",
    description:
      "Complete subscription management: checkout, webhooks, portal, plan upgrades/downgrades, and payment recovery.",
    tags: ["Payments", "Subscriptions", "Webhooks"],
    category: "SaaS Templates",
    frameworks: ["Next.js", "Supabase"],
    integrations: ["Stripe", "Supabase"],
    gradient: "from-violet-500/20 via-purple-500/10 to-pink-500/15",
    icon: ShoppingCart,
    complexity: "Intermediate",
    estimatedMinutes: 4,
  },
  {
    id: "ai-chat-app",
    name: "AI Chat App",
    description:
      "Multi-model AI chat with conversation history, streaming responses, model switching, and cost tracking.",
    tags: ["AI", "Chat", "Streaming", "Multi-model"],
    category: "AI Starter Kits",
    frameworks: ["Next.js", "AI SDK"],
    integrations: ["OpenAI", "Anthropic", "Gemini"],
    gradient: "from-orange-500/20 via-red-500/10 to-rose-500/15",
    icon: MessageSquare,
    complexity: "Beginner",
    estimatedMinutes: 3,
  },
  {
    id: "dashboard-starter",
    name: "Dashboard Starter",
    description:
      "Analytics dashboard with real-time charts, data tables, export, date range filters, and role-based views.",
    tags: ["Analytics", "Charts", "Real-time", "RBAC"],
    category: "SaaS Templates",
    frameworks: ["Next.js", "Supabase"],
    integrations: ["Supabase"],
    gradient: "from-cyan-500/20 via-sky-500/10 to-blue-500/15",
    icon: LayoutDashboard,
    complexity: "Intermediate",
    estimatedMinutes: 4,
  },
  {
    id: "community-platform",
    name: "Community Platform",
    description:
      "Social platform with posts, comments, reactions, user profiles, moderation queue, and real-time notifications.",
    tags: ["Social", "Real-time", "Notifications", "Moderation"],
    category: "SaaS Templates",
    frameworks: ["Next.js", "Supabase Realtime"],
    integrations: ["Supabase", "Resend"],
    gradient: "from-pink-500/20 via-rose-500/10 to-fuchsia-500/15",
    icon: Users,
    complexity: "Advanced",
    estimatedMinutes: 10,
  },
  {
    id: "marketplace-starter",
    name: "Marketplace Template",
    description:
      "Multi-vendor marketplace with product listings, seller onboarding, Stripe Connect payouts, and review system.",
    tags: ["Commerce", "Multi-vendor", "Payments", "Reviews"],
    category: "Commerce",
    frameworks: ["Next.js", "Supabase"],
    integrations: ["Stripe Connect", "Supabase"],
    gradient: "from-amber-500/20 via-yellow-500/10 to-orange-500/15",
    icon: Package,
    complexity: "Advanced",
    estimatedMinutes: 12,
  },
  {
    id: "landing-waitlist",
    name: "Landing Page + Waitlist",
    description:
      "Conversion-optimised landing page with waitlist signup, email confirmation, referral tracking, and launch countdown.",
    tags: ["Landing", "Waitlist", "Email", "Referral"],
    category: "Publishing Templates",
    frameworks: ["Next.js"],
    integrations: ["Resend", "Supabase"],
    gradient: "from-indigo-500/20 via-blue-500/10 to-sky-500/15",
    icon: Globe,
    complexity: "Beginner",
    estimatedMinutes: 2,
  },
  {
    id: "ai-agent-workspace",
    name: "AI Agent Workspace",
    description:
      "Autonomous agent dashboard with task queue, tool registry, execution logs, cost tracking, and approval workflows.",
    tags: ["Agents", "AI", "Automation", "Logs"],
    category: "AI Starter Kits",
    frameworks: ["Next.js", "AI SDK"],
    integrations: ["OpenAI", "Anthropic", "Supabase"],
    gradient: "from-slate-500/20 via-zinc-500/10 to-gray-500/15",
    icon: Zap,
    complexity: "Advanced",
    estimatedMinutes: 15,
  },
];

const CATEGORIES = [
  "All",
  "AI Starter Kits",
  "SaaS Templates",
  "Mobile Templates",
  "Commerce",
  "Publishing Templates",
];

const COMPLEXITY_COLORS: Record<Template["complexity"], string> = {
  Beginner: "text-positive bg-positive/10 ring-positive/20",
  Intermediate: "text-amber-500 bg-amber-500/10 ring-amber-500/20",
  Advanced: "text-accent bg-accent/10 ring-accent/20",
};

// ─── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({ template, onUse }: { template: Template; onUse: (t: Template) => void }) {
  const Icon = template.icon;
  return (
    <motion.div
      variants={variants.staggerItem}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-xl)] bg-surface shadow-[var(--shadow-card)] ring-1 ring-border transition hover:ring-accent/30 hover:shadow-[var(--shadow-glass)]"
    >
      {/* Gradient preview */}
      <div className={cn("relative min-h-[100px] overflow-hidden bg-gradient-to-br", template.gradient)}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(255,255,255,0.6),transparent_55%)] opacity-90 dark:opacity-20" />
        <div className="pointer-events-none absolute inset-0 ds-preview-grid opacity-25" />
        <div className="absolute left-3 top-3 flex size-8 items-center justify-center rounded-lg bg-surface/80 backdrop-blur-sm ring-1 ring-border/60">
          <Icon className="size-4 text-foreground" strokeWidth={1.75} />
        </div>
        <div className="absolute right-3 top-3">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", COMPLEXITY_COLORS[template.complexity])}>
            {template.complexity}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-[13.5px] font-semibold tracking-tight text-foreground">{template.name}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground line-clamp-2">{template.description}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {template.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border/50">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Star className="size-3 text-amber-400 fill-amber-400" strokeWidth={0} />
            Official
            <span className="ml-1 text-muted-foreground/50">·</span>
            <span>~{template.estimatedMinutes}m to generate</span>
          </div>
          <Button
            variant="accent"
            size="xs"
            onClick={() => onUse(template)}
            className="gap-1"
          >
            Use template
            <ArrowUpRight className="size-3" strokeWidth={2} />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Community empty state ─────────────────────────────────────────────────────

function CommunityEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-xl)] bg-surface py-16 text-center ring-1 ring-border">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20">
        <Users className="size-7 text-accent" strokeWidth={1.5} />
      </div>
      <p className="text-[15px] font-semibold tracking-tight text-foreground">No community apps yet</p>
      <p className="mt-2 max-w-sm text-[13px] text-muted-foreground">
        When builders publish their apps, they&apos;ll appear here. Build something with DreamOS86 and be the first.
      </p>
      <Button variant="accent" size="sm" className="mt-6">
        <Sparkles className="size-3.5" strokeWidth={1.75} />
        Start building
      </Button>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

type MarketplaceTab = "Official Templates" | "Community Apps" | "AI Starter Kits";
const TABS: MarketplaceTab[] = ["Official Templates", "Community Apps", "AI Starter Kits"];

export function MarketplaceView() {
  const [activeTab, setActiveTab] = React.useState<MarketplaceTab>("Official Templates");
  const [category, setCategory] = React.useState("All");
  const [search, setSearch] = React.useState("");

  const aiKits = OFFICIAL_TEMPLATES.filter((t) => t.category === "AI Starter Kits");
  const mainTemplates = OFFICIAL_TEMPLATES.filter((t) => t.category !== "AI Starter Kits");

  const source =
    activeTab === "AI Starter Kits" ? aiKits : mainTemplates;

  const filtered = source.filter((t) => {
    const matchCat = category === "All" || t.category === category;
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function handleUse(template: Template) {
    // Route user to Create home with template pre-selected
    const prompt = `Create a ${template.name}: ${template.description}. Use these integrations: ${template.integrations.join(", ")}.`;
    window.location.href = `/?template=${template.id}&prompt=${encodeURIComponent(prompt)}`;
  }

  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="pointer-events-none absolute -left-16 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--accent)_8%,transparent),transparent_68%)] blur-3xl" />

      <motion.div variants={variants.fadeUp} initial="hidden" animate="show">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">MARKETPLACE</p>
        <h1 className="mt-3 text-[clamp(1.75rem,3.5vw,2.4rem)] font-semibold tracking-[-0.055em] text-foreground">
          Templates & Extensions
        </h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Official starting points for every kind of app.
        </p>

        {/* Tabs */}
        <div className="mt-6 flex gap-1 rounded-xl bg-surface p-1 ring-1 ring-border w-fit">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { setActiveTab(tab); setCategory("All"); }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition",
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Community empty state */}
      {activeTab === "Community Apps" && (
        <motion.div variants={variants.fadeUp} initial="hidden" animate="show" className="mt-8">
          <CommunityEmptyState />
        </motion.div>
      )}

      {/* Templates / Kits */}
      {activeTab !== "Community Apps" && (
        <>
          <motion.div variants={variants.fadeUp} initial="hidden" animate="show" transition={{ delay: 0.05 }} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
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
            {activeTab === "Official Templates" && (
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-full px-3 py-1 text-[12px] font-medium transition",
                      category === c
                        ? "bg-foreground text-background"
                        : "bg-surface text-muted-foreground ring-1 ring-border hover:text-foreground",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {filtered.length === 0 ? (
            <div className="mt-8 flex flex-col items-center py-14 text-center">
              <p className="text-[14px] font-medium text-foreground">No templates match your search</p>
              <p className="mt-1 text-[13px] text-muted-foreground">Try a different keyword or category</p>
            </div>
          ) : (
            <motion.div
              variants={variants.staggerContainer}
              initial="hidden"
              animate="show"
              transition={{ delay: 0.1 }}
              className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {filtered.map((t) => (
                <TemplateCard key={t.id} template={t} onUse={handleUse} />
              ))}
            </motion.div>
          )}

          {/* Official badge */}
          <motion.div variants={variants.fadeUp} initial="hidden" animate="show" transition={{ delay: 0.2 }} className="mt-8 flex items-center gap-2.5 rounded-[var(--radius-lg)] bg-surface px-4 py-3 ring-1 ring-border">
            <Star className="size-4 fill-amber-400 text-amber-400" strokeWidth={0} />
            <p className="text-[12px] text-muted-foreground">
              All templates are maintained by the DreamOS86 team. Each one generates a complete, production-ready codebase.
            </p>
            <a
              href="https://github.com/dreamos86"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-[12px] text-accent hover:underline shrink-0"
            >
              View source <ExternalLink className="size-3" />
            </a>
          </motion.div>
        </>
      )}
    </div>
  );
}

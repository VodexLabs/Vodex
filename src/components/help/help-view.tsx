"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Search,
  BookOpen,
  MessageSquare,
  Zap,
  Code2,
  Rocket,
  CreditCard,
  Shield,
  ChevronRight,
  Send,
  Loader2,
  Check,
  Play,
  AlertCircle,
  KeyRound,
  Database,
  Wallet,
  Globe,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { variants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { getDocsByCategory } from "@/lib/docs";
import { searchHelpArticles } from "@/lib/help-search";

const QUICK_SETUP = [
  {
    icon: KeyRound,
    label: "OAuth setup",
    description: "Google, GitHub, callback URLs",
    href: "/help/docs/oauth-setup",
  },
  {
    icon: Database,
    label: "Supabase setup",
    description: "Project, keys, redirect URLs",
    href: "/help/docs/supabase-setup",
  },
  {
    icon: Wallet,
    label: "Payments setup",
    description: "Stripe, webhooks, compliance",
    href: "/help/docs/payments-providers",
  },
  {
    icon: Globe,
    label: "Publishing setup",
    description: "Deploy, domains, env vars",
    href: "/help/docs/deployment",
  },
  {
    icon: Smartphone,
    label: "Mobile app setup",
    description: "Play Store, TWA, wrapping",
    href: "/help/docs/play-store-setup",
  },
] as const;

const CATEGORY_ICONS: Record<string, typeof Rocket> = {
  "Getting Started": Rocket,
  "AI Modes": Zap,
  Integrations: Code2,
  Billing: CreditCard,
  Deployment: Shield,
  Configuration: BookOpen,
  "Mobile Publishing": Smartphone,
  "ZIP Imports": BookOpen,
  FAQ: MessageSquare,
};

type TicketForm = {
  subject: string;
  body: string;
  category: string;
};

function ContactSupport() {
  const [form, setForm] = React.useState<TicketForm>({ subject: "", body: "", category: "general" });
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed to submit ticket");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-positive/10 ring-1 ring-positive/20">
          <Check className="size-6 text-positive" strokeWidth={2} />
        </div>
        <p className="text-sm font-semibold text-foreground">Ticket submitted</p>
        <p className="mt-1 text-xs text-muted-foreground">We&apos;ll get back to you within 24 hours.</p>
        <button
          type="button"
          onClick={() => {
            setSuccess(false);
            setForm({ subject: "", body: "", category: "general" });
          }}
          className="mt-4 text-xs text-accent hover:underline underline-offset-2"
        >
          Submit another ticket
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive ring-1 ring-destructive/20">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Category</label>
        <select
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          className="h-9 w-full rounded-[var(--radius-md)] bg-surface px-3 text-sm text-foreground ring-1 ring-border outline-none focus:ring-accent/40"
        >
          <option value="general">General question</option>
          <option value="billing">Billing</option>
          <option value="technical">Technical issue</option>
          <option value="feature">Feature request</option>
          <option value="abuse">Report abuse</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Subject</label>
        <Input
          placeholder="Brief description of your issue"
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Details</label>
        <textarea
          placeholder="Describe your issue in detail…"
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          rows={5}
          required
          className="w-full resize-none rounded-[var(--radius-md)] bg-surface px-3 py-2 text-sm text-foreground ring-1 ring-border outline-none focus:ring-accent/40"
        />
      </div>

      <Button
        variant="accent"
        size="sm"
        type="submit"
        disabled={loading || !form.subject || !form.body}
        className="gap-1.5"
      >
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" strokeWidth={2} />}
        Submit ticket
      </Button>
    </form>
  );
}

function HelpAmbientBackground({ reducedMotion }: { reducedMotion: boolean }) {
  if (reducedMotion) {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-accent/8 to-transparent"
      />
    );
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden">
      <div className="help-ambient-orb help-ambient-orb-a absolute -left-20 top-8 size-56 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="help-ambient-orb help-ambient-orb-b absolute -right-16 top-12 size-48 rounded-full bg-accent/15 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />
    </div>
  );
}

export function HelpView() {
  const [search, setSearch] = React.useState("");
  const reduceMotion = useReducedMotion();
  const byCategory = React.useMemo(() => getDocsByCategory(), []);
  const searchHits = React.useMemo(
    () => (search.trim() ? searchHelpArticles(search, 10) : []),
    [search],
  );

  const showSearchResults = search.trim().length > 0;

  return (
    <div className="relative mx-auto max-w-4xl pb-16">
      <HelpAmbientBackground reducedMotion={!!reduceMotion} />

      <motion.div
        variants={variants.staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        className="relative space-y-8"
      >
        <motion.div variants={variants.fadeUp} className="text-center">
          <h1 className="text-[26px] font-semibold tracking-tight text-foreground">Help Center</h1>
          <p className="mt-2 text-sm text-muted-foreground">Find answers, guides, and support resources.</p>
          <div className="relative mx-auto mt-5 max-w-md">
            <Search
              className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.75}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search docs, errors, keywords…"
              className="h-11 w-full rounded-[var(--radius-xl)] bg-surface/90 pl-10 pr-4 text-sm text-foreground ring-1 ring-border backdrop-blur-sm outline-none transition-shadow focus:ring-accent/40"
            />
          </div>
        </motion.div>

        {showSearchResults && (
          <motion.div
            variants={variants.fadeUp}
            className="rounded-[var(--radius-xl)] bg-surface/95 p-4 ring-1 ring-border backdrop-blur-sm"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Search results
            </p>
            {searchHits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No articles found. Try &quot;redirect URI mismatch&quot;, &quot;Build Credits&quot;, or &quot;Play
                Store&quot;.
              </p>
            ) : (
              <ul className="space-y-2">
                {searchHits.map((hit) => (
                  <li key={hit.slug}>
                    <Link
                      href={`/help/docs/${hit.slug}`}
                      className="flex items-start gap-2 rounded-lg px-2 py-2 transition hover:bg-background"
                    >
                      <ChevronRight className="mt-0.5 size-3 shrink-0 text-accent" strokeWidth={2} />
                      <span>
                        <span className="block text-sm font-medium text-foreground">{hit.title}</span>
                        <span className="block text-xs text-muted-foreground">{hit.description}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}

        <motion.div variants={variants.fadeUp}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Quick setup assistant
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_SETUP.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative overflow-hidden rounded-[var(--radius-xl)] bg-surface/90 p-4 ring-1 ring-border",
                  "transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/5 hover:ring-accent/30",
                )}
              >
                <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-accent/10 transition group-hover:bg-accent/15">
                  <item.icon className="size-4 text-accent" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
              </Link>
            ))}
          </div>
        </motion.div>

        {!showSearchResults && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(byCategory).map(([cat, docs]) => {
              const Icon = CATEGORY_ICONS[cat] ?? BookOpen;
              return (
                <motion.div
                  key={cat}
                  variants={variants.fadeUp}
                  className={cn(
                    "rounded-[var(--radius-xl)] bg-surface/90 p-5 ring-1 ring-border backdrop-blur-sm",
                    "transition duration-300 hover:-translate-y-0.5 hover:ring-accent/25",
                  )}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-accent/10">
                      <Icon className="size-4 text-accent" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{cat}</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {docs.map((doc) => (
                      <li key={doc.slug}>
                        <Link
                          href={`/help/docs/${doc.slug}`}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition hover:bg-background hover:text-foreground"
                        >
                          <ChevronRight className="size-3 shrink-0" strokeWidth={1.75} />
                          {doc.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        )}

        <motion.div
          variants={variants.fadeUp}
          className="rounded-[var(--radius-xl)] bg-surface/90 p-5 ring-1 ring-border backdrop-blur-sm"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted/50">
              <Play className="size-4 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Video Tutorials</h3>
              <p className="text-xs text-muted-foreground">Step-by-step walkthroughs</p>
            </div>
            <span className="ml-auto rounded-full bg-muted/60 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              Coming Soon
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Video tutorials are launching soon. Until then, start with the{" "}
            <Link href="/help/docs/help-faq" className="text-accent hover:underline">
              FAQ
            </Link>{" "}
            or{" "}
            <Link href="/help/docs/getting-started" className="text-accent hover:underline">
              Getting Started
            </Link>
            .
          </p>
        </motion.div>

        <motion.div
          variants={variants.fadeUp}
          className="rounded-[var(--radius-xl)] bg-surface/90 ring-1 ring-border backdrop-blur-sm"
        >
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <MessageSquare className="size-4 text-muted-foreground" strokeWidth={1.75} />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Contact Support</h3>
              <p className="text-xs text-muted-foreground">
                We typically respond within 24 hours ·{" "}
                <a
                  href="mailto:support@dreamos86.com"
                  className="text-accent hover:underline underline-offset-2"
                >
                  support@dreamos86.com
                </a>
              </p>
            </div>
          </div>
          <div className="p-5">
            <ContactSupport />
          </div>
        </motion.div>
      </motion.div>

      <style jsx global>{`
        @keyframes help-orb-drift-a {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(24px, 12px) scale(1.08);
          }
        }
        @keyframes help-orb-drift-b {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-20px, 16px) scale(1.05);
          }
        }
        .help-ambient-orb-a {
          animation: help-orb-drift-a 14s ease-in-out infinite;
        }
        .help-ambient-orb-b {
          animation: help-orb-drift-b 18s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .help-ambient-orb {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Search, BookOpen, MessageSquare, Zap, Code2, Rocket,
  CreditCard, Shield, ChevronRight, Send, Loader2, Check,
  Play, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { variants } from "@/lib/motion";
import { cn } from "@/lib/utils";

const DOC_CATEGORIES = [
  {
    icon: Rocket,
    label: "Getting Started",
    articles: [
      { title: "Getting started", href: "/help/docs/getting-started" },
      { title: "How AI Chat works", href: "/help/docs/how-ai-chat-works" },
      { title: "Deploying your app", href: "/help/docs/deployment" },
      { title: "Understanding credits & billing", href: "/help/docs/how-credits-work" },
    ],
  },
  {
    icon: Zap,
    label: "AI Modes",
    articles: [
      { title: "AI mode overview", href: "/help/docs/how-ai-chat-works" },
      { title: "Model routing & selection", href: "/help/docs/model-routing" },
      { title: "Orchestration modes explained", href: "/help/docs/model-routing" },
      { title: "How credits are calculated", href: "/help/docs/how-credits-work" },
    ],
  },
  {
    icon: Code2,
    label: "Integrations",
    articles: [
      { title: "Google & GitHub OAuth setup", href: "/help/docs/oauth-setup" },
      { title: "Supabase setup", href: "/help/docs/supabase-setup" },
      { title: "GitHub integration", href: "/help/docs/github-integration" },
      { title: "Environment variables", href: "/help/docs/environment-variables" },
    ],
  },
  {
    icon: CreditCard,
    label: "Billing",
    articles: [
      { title: "How credits work", href: "/help/docs/how-credits-work" },
      { title: "Plans and pricing", href: "/pricing" },
      { title: "Manage subscription", href: "/settings/billing" },
      { title: "Billing overview", href: "/help/docs/billing-credits" },
    ],
  },
  {
    icon: Shield,
    label: "Deployment",
    articles: [
      { title: "Deploying to Vercel", href: "/help/docs/deployment" },
      { title: "Custom domains", href: "/help/docs/deployment" },
      { title: "ZIP import & restoration", href: "/help/docs/zip-import" },
      { title: "Play Store setup", href: "/help/docs/play-store-setup" },
    ],
  },
];

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
        <p className="text-[14px] font-semibold text-foreground">Ticket submitted</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          We&apos;ll get back to you within 24 hours.
        </p>
        <button
          onClick={() => { setSuccess(false); setForm({ subject: "", body: "", category: "general" }); }}
          className="mt-4 text-[12px] text-accent hover:underline underline-offset-2"
        >
          Submit another ticket
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-[12px] text-destructive ring-1 ring-destructive/20">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">Category</label>
        <select
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          className="h-9 w-full rounded-[var(--radius-md)] bg-surface px-3 text-[13px] text-foreground ring-1 ring-border outline-none focus:ring-accent/40"
        >
          <option value="general">General question</option>
          <option value="billing">Billing</option>
          <option value="technical">Technical issue</option>
          <option value="feature">Feature request</option>
          <option value="abuse">Report abuse</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">Subject</label>
        <Input
          placeholder="Brief description of your issue"
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">Details</label>
        <textarea
          placeholder="Describe your issue in detail…"
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          rows={5}
          required
          className="w-full rounded-[var(--radius-md)] bg-surface px-3 py-2 text-[13px] text-foreground ring-1 ring-border outline-none focus:ring-accent/40 resize-none"
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

export function HelpView() {
  const [search, setSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);

  const filtered = DOC_CATEGORIES.map((cat) => ({
    ...cat,
    articles: cat.articles.filter(
      (a) =>
        !search ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        cat.label.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((cat) => cat.articles.length > 0);

  return (
    <motion.div
      variants={variants.staggerContainer}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-4xl space-y-8 pb-16"
    >
      {/* Search */}
      <motion.div variants={variants.fadeUp} className="text-center">
        <h1 className="text-[26px] font-semibold tracking-[-0.04em] text-foreground">Help Center</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">Find answers, guides, and support resources.</p>
        <div className="relative mx-auto mt-5 max-w-md">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documentation…"
            className="h-11 w-full rounded-[var(--radius-xl)] bg-surface pl-10 pr-4 text-[13.5px] text-foreground ring-1 ring-border outline-none focus:ring-accent/40"
          />
        </div>
      </motion.div>

      {/* Doc categories */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(search ? filtered : DOC_CATEGORIES).map((cat) => (
          <motion.div
            key={cat.label}
            variants={variants.fadeUp}
            className="rounded-[var(--radius-xl)] bg-surface p-5 ring-1 ring-border"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-accent/10">
                <cat.icon className="size-4 text-accent" strokeWidth={1.75} />
              </div>
              <h3 className="text-[13px] font-semibold text-foreground">{cat.label}</h3>
            </div>
            <ul className="space-y-1.5">
              {(search
                ? cat.articles.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()))
                : cat.articles
              ).map((article) => (
                <li key={article.title}>
                  <a
                    href={article.href}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] text-muted-foreground transition hover:bg-background hover:text-foreground"
                  >
                    <ChevronRight className="size-3 shrink-0" strokeWidth={1.75} />
                    {article.title}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      {/* Video tutorials — Coming Soon */}
      <motion.div variants={variants.fadeUp} className="rounded-[var(--radius-xl)] bg-surface p-5 ring-1 ring-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted/50">
            <Play className="size-4 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">Video Tutorials</h3>
            <p className="text-[12px] text-muted-foreground">Step-by-step walkthroughs</p>
          </div>
          <span className="ml-auto rounded-full bg-muted/60 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
            Coming Soon
          </span>
        </div>
        <p className="text-[13px] text-muted-foreground">
          Video tutorials are launching soon. We&apos;ll cover everything from creating your first app to advanced
          deployment strategies and AI model selection.
        </p>
      </motion.div>

      {/* Contact Support */}
      <motion.div variants={variants.fadeUp} className="rounded-[var(--radius-xl)] bg-surface ring-1 ring-border">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <MessageSquare className="size-4 text-muted-foreground" strokeWidth={1.75} />
          <div>
            <h3 className="text-[14px] font-semibold text-foreground">Contact Support</h3>
            <p className="text-[12px] text-muted-foreground">
              We typically respond within 24 hours ·{" "}
              <a href="mailto:support@dreamos86.com" className="text-accent hover:underline underline-offset-2">
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
  );
}

"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Heart, MessageCircle, GitBranch, Users,
  Plus, Sparkles, Flame, TrendingUp, Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { variants, whileHover, whileTap, transition } from "@/lib/motion";
import { cn } from "@/lib/utils";

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyTabState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; icon?: React.ElementType };
}) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-xl)] bg-surface py-16 text-center ring-1 ring-border">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20">
        <Icon className="size-7 text-accent" strokeWidth={1.5} />
      </div>
      <p className="text-[15px] font-semibold text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-[13px] text-muted-foreground">{description}</p>
      {action && (
        <Button variant="accent" size="sm" className="mt-6 gap-1.5">
          {action.icon && <action.icon className="size-3.5" strokeWidth={1.75} />}
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ─── Discussion section (early access seeded content) ─────────────────────────
// These are genuine discussion prompts that map to real platform capabilities.

interface Discussion {
  id: string;
  title: string;
  replies: number;
  cat: string;
  hot: boolean;
  author: string;
}

const SEED_DISCUSSIONS: Discussion[] = [
  {
    id: "d1",
    title: "Best practices for building multi-page apps in DreamOS86",
    replies: 0,
    cat: "Tips",
    hot: false,
    author: "DreamOS86 Team",
  },
  {
    id: "d2",
    title: "How to set up Supabase auth with DreamOS86 projects",
    replies: 0,
    cat: "Guide",
    hot: false,
    author: "DreamOS86 Team",
  },
  {
    id: "d3",
    title: "Publishing your first app to the Play Store from DreamOS86",
    replies: 0,
    cat: "Guide",
    hot: false,
    author: "DreamOS86 Team",
  },
  {
    id: "d4",
    title: "Feature request thread: What should we build next?",
    replies: 0,
    cat: "Feedback",
    hot: false,
    author: "DreamOS86 Team",
  },
];

const tabs = ["Trending", "Community", "Discussions", "Builders"] as const;
type Tab = typeof tabs[number];

export function CommunityView() {
  const [tab, setTab] = React.useState<Tab>("Trending");

  return (
    <div className="relative mx-auto max-w-5xl">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -left-16 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--accent)_8%,transparent),transparent_68%)] blur-3xl" />

      {/* Header */}
      <motion.div
        variants={variants.fadeUp}
        initial="hidden"
        animate="show"
        className="relative flex items-start justify-between gap-4"
      >
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">COMMUNITY</p>
          <h1 className="mt-3 text-[clamp(1.75rem,3.5vw,2.4rem)] font-semibold tracking-[-0.055em] text-foreground">
            Community
          </h1>
          <p className="mt-1 text-[14px] text-muted-foreground">Built by builders, for builders.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent/12 px-3 py-1 text-[11px] font-semibold text-accent ring-1 ring-accent/20">
            Early Access
          </span>
          <Button variant="accent" size="md" disabled>
            <Plus className="size-4" strokeWidth={1.75} />
            Share creation
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        variants={variants.fadeUp}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.05 }}
        className="relative mt-6 flex gap-1 overflow-x-auto rounded-[var(--radius-lg)] bg-surface p-1 ring-1 ring-border scrollbar-none"
      >
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 rounded-[calc(var(--radius-lg)-2px)] px-4 py-1.5 text-[13px] font-medium transition",
              tab === t
                ? "bg-foreground text-background shadow-[var(--shadow-xs)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </motion.div>

      {/* Trending — empty until real data */}
      {tab === "Trending" && (
        <motion.div
          variants={variants.fadeUp}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.1 }}
          className="mt-6"
        >
          <EmptyTabState
            icon={Flame}
            title="Trending apps coming soon"
            description="As builders publish their apps, the most popular ones will surface here. Be the first to build something trending."
            action={{ label: "Start building", icon: Rocket }}
          />
        </motion.div>
      )}

      {/* Community apps — empty until published */}
      {tab === "Community" && (
        <motion.div
          variants={variants.fadeUp}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.1 }}
          className="mt-6"
        >
          <EmptyTabState
            icon={Users}
            title="No community apps published yet"
            description="Publish your first app from DreamOS86 to appear here. Community sharing launches with public release."
            action={{ label: "Build and publish", icon: Sparkles }}
          />
        </motion.div>
      )}

      {/* Discussions — seeded with real platform guides */}
      {tab === "Discussions" && (
        <motion.div
          variants={variants.fadeUp}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.1 }}
        >
          <div className="mt-6 overflow-hidden rounded-[var(--radius-xl)] bg-surface shadow-[var(--shadow-card)] ring-1 ring-border divide-y divide-border/60">
            {SEED_DISCUSSIONS.map((disc) => (
              <div
                key={disc.id}
                className="flex items-center gap-4 px-5 py-4 transition hover:bg-muted/30 cursor-pointer"
              >
                <Avatar name={disc.author} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-medium text-foreground">{disc.title}</p>
                    {disc.hot && <TrendingUp className="size-3 shrink-0 text-amber-500" strokeWidth={2} />}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
                      {disc.cat}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {disc.replies === 0 ? "Start the discussion" : `${disc.replies} replies`}
                    </span>
                    <span className="text-[12px] text-muted-foreground">·</span>
                    <span className="text-[12px] text-muted-foreground">{disc.author}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Heart className="size-3" strokeWidth={1.55} />0</span>
                  <span className="flex items-center gap-1"><MessageCircle className="size-3" strokeWidth={1.55} />{disc.replies}</span>
                  <span className="flex items-center gap-1"><GitBranch className="size-3" strokeWidth={1.55} />0</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[12px] text-muted-foreground">
            Full discussion forum launches with public release.{" "}
            <button className="text-accent hover:underline">Get notified →</button>
          </p>
        </motion.div>
      )}

      {/* Builders — empty */}
      {tab === "Builders" && (
        <motion.div
          variants={variants.fadeUp}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.1 }}
          className="mt-6"
        >
          <EmptyTabState
            icon={Users}
            title="Builder leaderboard coming soon"
            description="Top contributors will be featured here once community publishing is live."
          />
        </motion.div>
      )}
    </div>
  );
}

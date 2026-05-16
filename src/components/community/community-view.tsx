"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, MessageCircle, Plus, Sparkles, Flame, TrendingUp, Rocket,
  Users, X, Loader2, ChevronRight, Tag, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { variants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Discussion } from "@/lib/supabase/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type DiscussionWithAuthor = Discussion & {
  author_name?: string;
  author_avatar?: string;
  liked?: boolean;
};

const CATEGORIES = ["General", "Tips", "Guide", "Feedback", "Showcase", "Question", "Announcement"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_COLORS: Record<string, string> = {
  General: "bg-muted/60 text-muted-foreground",
  Tips: "bg-accent/10 text-accent",
  Guide: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Feedback: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Showcase: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  Question: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  Announcement: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
};

// ─── Create discussion modal ──────────────────────────────────────────────────

function CreateDiscussionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (d: Discussion) => void;
}) {
  const supabase = createClient();
  const { user, profile } = useAuthStore();
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [category, setCategory] = React.useState<Category>("General");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !title.trim() || !body.trim()) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("discussions")
      .insert({ user_id: user.id, title: title.trim(), body: body.trim(), category })
      .select()
      .single();

    if (err || !data) {
      setError(err?.message ?? "Failed to create discussion.");
      setLoading(false);
    } else {
      onCreated(data as Discussion);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg overflow-hidden rounded-[var(--radius-xl)] bg-background shadow-2xl ring-1 ring-border"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="text-[14px] font-semibold text-foreground">Start a discussion</p>
          <button onClick={onClose} className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-surface hover:text-foreground transition">
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-[12px] text-destructive ring-1 ring-destructive/20">{error}</div>
          )}

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Category</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11.5px] font-medium transition ring-1",
                    category === cat
                      ? "bg-foreground text-background ring-transparent"
                      : "ring-border text-muted-foreground hover:text-foreground hover:bg-surface",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={200}
              required
              className="h-10 w-full rounded-[var(--radius-md)] bg-surface px-3 text-[13px] text-foreground ring-1 ring-border outline-none focus:ring-accent/50 transition placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your thoughts, questions, or ideas…"
              rows={5}
              maxLength={10000}
              required
              className="w-full rounded-[var(--radius-md)] bg-surface px-3 py-2.5 text-[13px] text-foreground ring-1 ring-border outline-none focus:ring-accent/50 transition resize-none placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button variant="accent" size="sm" type="submit" disabled={loading || !title.trim() || !body.trim()} className="gap-1.5">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" strokeWidth={1.75} />}
              Post
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Discussion card ──────────────────────────────────────────────────────────

function DiscussionCard({
  disc,
  onLike,
}: {
  disc: DiscussionWithAuthor;
  onLike: (id: string) => void;
}) {
  const authorName = disc.author_name ?? "Community member";
  const timeAgo = React.useMemo(() => {
    const diff = Date.now() - new Date(disc.created_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }, [disc.created_at]);

  return (
    <div className="flex items-start gap-4 px-5 py-4 transition hover:bg-muted/20 cursor-pointer">
      <Avatar name={authorName} src={disc.author_avatar} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="flex-1 text-[13px] font-medium text-foreground leading-snug">{disc.title}</p>
          {disc.is_pinned && (
            <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent shrink-0">Pinned</span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", CATEGORY_COLORS[disc.category] ?? CATEGORY_COLORS.General)}>
            {disc.category}
          </span>
          <span className="text-[11.5px] text-muted-foreground">{authorName}</span>
          <span className="text-[11.5px] text-muted-foreground/40">·</span>
          <span className="text-[11.5px] text-muted-foreground">{timeAgo}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-[11px] text-muted-foreground">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onLike(disc.id); }}
          className={cn(
            "flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-surface",
            disc.liked && "text-red-500",
          )}
        >
          <Heart className={cn("size-3.5", disc.liked && "fill-current")} strokeWidth={disc.liked ? 0 : 1.55} />
          {disc.like_count}
        </button>
        <span className="flex items-center gap-1">
          <MessageCircle className="size-3.5" strokeWidth={1.55} />
          {disc.reply_count}
        </span>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyDiscussions({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-xl)] bg-surface py-16 text-center ring-1 ring-border">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20">
        <MessageCircle className="size-7 text-accent" strokeWidth={1.5} />
      </div>
      <p className="text-[15px] font-semibold text-foreground">No discussions yet</p>
      <p className="mt-2 max-w-sm text-[13px] text-muted-foreground">
        Be the first to start a conversation. Ask a question, share a tip, or show what you built.
      </p>
      <Button variant="accent" size="sm" className="mt-6 gap-1.5" onClick={onStart}>
        <Plus className="size-3.5" strokeWidth={2} />
        Start a discussion
      </Button>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

const TABS = ["Trending", "Community", "Discussions", "Builders"] as const;
type Tab = (typeof TABS)[number];

export function CommunityView() {
  const supabase = createClient();
  const { user } = useAuthStore();
  const [tab, setTab] = React.useState<Tab>("Discussions");
  const [discussions, setDiscussions] = React.useState<DiscussionWithAuthor[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreate, setShowCreate] = React.useState(false);
  const [likedIds, setLikedIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (tab !== "Discussions") { setLoading(false); return; }
    setLoading(true);

    Promise.all([
      supabase
        .from("discussions")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50),
      user
        ? supabase.from("discussion_likes").select("discussion_id").eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
    ]).then(([{ data: discs }, { data: likes }]) => {
      const liked = new Set((likes ?? []).map((l: { discussion_id: string }) => l.discussion_id));
      setLikedIds(liked);
      setDiscussions(
        (discs ?? []).map((d) => ({
          ...d,
          liked: liked.has(d.id),
        })) as DiscussionWithAuthor[],
      );
      setLoading(false);
    });
  }, [tab, user?.id]);

  async function handleLike(discussionId: string) {
    if (!user) return;
    const isLiked = likedIds.has(discussionId);

    setDiscussions((prev) =>
      prev.map((d) =>
        d.id === discussionId
          ? { ...d, liked: !isLiked, like_count: d.like_count + (isLiked ? -1 : 1) }
          : d,
      ),
    );
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(discussionId);
      else next.add(discussionId);
      return next;
    });

    if (isLiked) {
      await supabase.from("discussion_likes").delete().eq("user_id", user.id).eq("discussion_id", discussionId);
      await supabase.from("discussions").update({ like_count: discussions.find((d) => d.id === discussionId)!.like_count - 1 }).eq("id", discussionId);
    } else {
      await supabase.from("discussion_likes").insert({ user_id: user.id, discussion_id: discussionId });
      await supabase.from("discussions").update({ like_count: discussions.find((d) => d.id === discussionId)!.like_count + 1 }).eq("id", discussionId);
    }
  }

  function handleCreated(d: Discussion) {
    const profileName = useAuthStore.getState().profile?.full_name ?? user?.email?.split("@")[0] ?? "You";
    setDiscussions((prev) => [{ ...d, author_name: profileName, liked: false }, ...prev]);
    setTab("Discussions");
  }

  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="pointer-events-none absolute -left-16 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--accent)_8%,transparent),transparent_68%)] blur-3xl" />

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
          <Button variant="accent" size="md" onClick={() => setShowCreate(true)} disabled={!user}>
            <Plus className="size-4" strokeWidth={1.75} />
            Start discussion
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
        {TABS.map((t) => (
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

      {/* Trending tab */}
      {tab === "Trending" && (
        <motion.div variants={variants.fadeUp} initial="hidden" animate="show" transition={{ delay: 0.1 }} className="mt-6">
          <div className="flex flex-col items-center rounded-[var(--radius-xl)] bg-surface py-16 text-center ring-1 ring-border">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20">
              <Flame className="size-7 text-accent" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-semibold text-foreground">Trending coming soon</p>
            <p className="mt-2 max-w-sm text-[13px] text-muted-foreground">
              As the community grows, the most-liked and most-discussed posts will surface here.
            </p>
            <Button variant="accent" size="sm" className="mt-6 gap-1.5" onClick={() => setTab("Discussions")}>
              <Sparkles className="size-3.5" strokeWidth={1.75} />
              Browse discussions
            </Button>
          </div>
        </motion.div>
      )}

      {/* Community apps tab */}
      {tab === "Community" && (
        <motion.div variants={variants.fadeUp} initial="hidden" animate="show" transition={{ delay: 0.1 }} className="mt-6">
          <div className="flex flex-col items-center rounded-[var(--radius-xl)] bg-surface py-16 text-center ring-1 ring-border">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20">
              <Rocket className="size-7 text-accent" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-semibold text-foreground">Community apps</p>
            <p className="mt-2 max-w-sm text-[13px] text-muted-foreground">
              Publish your first app from DreamOS86 to appear here. Community sharing launches with public release.
            </p>
          </div>
        </motion.div>
      )}

      {/* Discussions tab */}
      {tab === "Discussions" && (
        <motion.div variants={variants.fadeUp} initial="hidden" animate="show" transition={{ delay: 0.1 }} className="mt-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : discussions.length === 0 ? (
            <EmptyDiscussions onStart={() => setShowCreate(true)} />
          ) : (
            <div className="overflow-hidden rounded-[var(--radius-xl)] bg-surface shadow-[var(--shadow-card)] ring-1 ring-border divide-y divide-border/60">
              {discussions.map((disc) => (
                <DiscussionCard key={disc.id} disc={disc} onLike={handleLike} />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Builders tab */}
      {tab === "Builders" && (
        <motion.div variants={variants.fadeUp} initial="hidden" animate="show" transition={{ delay: 0.1 }} className="mt-6">
          <div className="flex flex-col items-center rounded-[var(--radius-xl)] bg-surface py-16 text-center ring-1 ring-border">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20">
              <Users className="size-7 text-accent" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-semibold text-foreground">Builder leaderboard</p>
            <p className="mt-2 max-w-sm text-[13px] text-muted-foreground">
              Top contributors will be featured here once community publishing is live.
            </p>
          </div>
        </motion.div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateDiscussionModal
            onClose={() => setShowCreate(false)}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

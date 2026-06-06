"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Send, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Discussion } from "@/lib/supabase/types";

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  like_count: number;
  author_name?: string;
  liked?: boolean;
};

function commentScore(c: CommentRow): number {
  const likes = c.like_count ?? 0;
  const ageH = (Date.now() - new Date(c.created_at).getTime()) / 3_600_000;
  const recency = Math.max(0, 48 - ageH) / 48;
  return likes * 3 + recency * 2 + Math.random() * 0.15;
}

export function DiscussionDetailDrawer({
  discussion,
  authorName,
  authorAvatar,
  liked,
  onClose,
  onLikeToggle,
}: {
  discussion: Discussion;
  authorName: string;
  authorAvatar?: string | null;
  liked?: boolean;
  onClose: () => void;
  onLikeToggle: () => void;
}) {
  const supabase = createClient();
  const { user } = useAuthStore();
  const [comments, setComments] = React.useState<CommentRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [body, setBody] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("discussion_replies")
        .select("id, body, created_at, user_id, like_count")
        .eq("discussion_id", discussion.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error("Could not load comments");
        setComments([]);
      } else {
        const rows = (data ?? []) as CommentRow[];
        setComments([...rows].sort((a, b) => commentScore(b) - commentScore(a)));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [discussion.id, supabase]);

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !user) return;
    setSaving(true);
    const optimistic: CommentRow = {
      id: `opt-${Date.now()}`,
      body: text,
      created_at: new Date().toISOString(),
      user_id: user.id,
      like_count: 0,
      author_name: "You",
    };
    setComments((prev) => [...prev, optimistic]);
    setBody("");
    try {
      const { data, error } = await supabase
        .from("discussion_replies")
        .insert({ discussion_id: discussion.id, user_id: user.id, body: text })
        .select("id, body, created_at, user_id, like_count")
        .single();
      if (error) throw error;
      setComments((prev) =>
        prev
          .map((c) => (c.id === optimistic.id ? ({ ...data, author_name: "You" } as CommentRow) : c))
          .sort((a, b) => commentScore(b) - commentScore(a)),
      );
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      setBody(text);
      toast.error("Could not save comment");
    } finally {
      setSaving(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[10050] lg:flex lg:justify-end" role="dialog" aria-modal="true">
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]"
          aria-label="Close"
          onClick={onClose}
        />
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
          className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-background shadow-2xl ring-1 ring-border lg:max-h-[100dvh]"
          data-testid="discussion-detail-drawer"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="truncate text-[14px] font-semibold">{discussion.title}</p>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
              <X className="size-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <div className="flex items-start gap-3">
              <Avatar name={authorName} src={authorAvatar} size="sm" />
              <div>
                <p className="text-[12px] font-medium text-muted-foreground">{authorName}</p>
                <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">{discussion.body}</p>
                <button
                  type="button"
                  onClick={onLikeToggle}
                  className={cn(
                    "mt-3 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px]",
                    liked ? "text-red-500" : "text-muted-foreground",
                  )}
                >
                  <Heart className={cn("size-3.5", liked && "fill-current")} />
                  {discussion.like_count}
                </button>
              </div>
            </div>
            <div className="mt-6 border-t border-border pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Comments</p>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <p className="py-6 text-[13px] text-muted-foreground">No comments yet — start the thread.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {comments.map((c) => (
                    <li key={c.id} className="rounded-xl bg-surface/80 px-3 py-2.5 ring-1 ring-border/60">
                      <p className="text-[11px] font-medium text-muted-foreground">{c.author_name ?? "Member"}</p>
                      <p className="mt-1 text-[13px] text-foreground">{c.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {user ? (
            <form
              onSubmit={(e) => void submitComment(e)}
              className="border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
            >
              <div className="flex gap-2">
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Add a comment…"
                  className="min-w-0 flex-1 rounded-xl bg-surface px-3 py-2.5 text-[13px] ring-1 ring-border"
                />
                <button
                  type="submit"
                  disabled={saving || !body.trim()}
                  className="rounded-xl bg-accent px-3 py-2.5 text-white disabled:opacity-50"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </form>
          ) : null}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}

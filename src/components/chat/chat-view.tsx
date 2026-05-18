"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Send, Paperclip, Sparkles, X, AlertCircle,
  Loader2, Copy, Check, RotateCcw, MoreHorizontal,
  Link2, HelpCircle, MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useCreditsStore } from "@/lib/stores/credits-store";
import type { Conversation, Message } from "@/lib/supabase/types";
import { variants } from "@/lib/motion";
import { CreditsUpgradeModal } from "@/components/chat/credits-upgrade-modal";

// AI Chat auto-routes to the cheapest available model — no manual selection.
// This is the discuss-only lightweight assistant.
const AUTO_MODEL_ID = "claude-haiku-4-5";
const CREDITS_PER_MESSAGE = 1;

// ─── Data hooks ───────────────────────────────────────────────────────────────

function useConversations(userId: string | undefined) {
  const supabase = createClient();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // If no user yet, stop loading immediately (profile may still be bootstrapping)
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .eq("archived", false)
      .order("updated_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setConversations(data ?? []);
        setLoading(false);
      }, () => {
        setLoading(false);
      });
  }, [userId]);

  return { conversations, setConversations, loading };
}

function useMessages(conversationId: string | null, userId: string | undefined) {
  const supabase = createClient();
  const [history, setHistory] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!conversationId || !userId) { setHistory([]); return; }
    setLoading(true);
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setHistory((data as Message[]) ?? []);
        setLoading(false);
      });
  }, [conversationId]);

  return { history, loading };
}

function messageText(msg: { content?: string; parts?: UIMessage["parts"] }): string {
  if (typeof msg.content === "string" && msg.content.length > 0) return msg.content;
  if (!msg.parts?.length) return "";
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

// ─── Message action menu ──────────────────────────────────────────────────────

function MessageActionMenu({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function copyText() {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setOpen(false);
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex size-6 cursor-pointer items-center justify-center rounded-lg text-muted-foreground/40 opacity-0 transition hover:bg-surface hover:text-muted-foreground group-hover:opacity-100 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Message actions"
      >
        <MoreHorizontal className="size-3.5" strokeWidth={1.75} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-full left-0 z-50 mb-1 w-48 overflow-hidden rounded-xl bg-background shadow-xl ring-1 ring-border"
          >
            <div className="p-1">
              <button
                type="button"
                onClick={copyText}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-foreground transition hover:bg-surface"
              >
                {copied
                  ? <Check className="size-3.5 text-positive shrink-0" strokeWidth={2} />
                  : <Copy className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />}
                {copied ? "Copied!" : "Copy message"}
              </button>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(window.location.href).catch(() => {}); setOpen(false); }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-foreground transition hover:bg-surface"
              >
                <Link2 className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                Copy link
              </button>
              <div className="my-1 h-px bg-border/60 mx-1" />
              <Link
                href="/help/docs/how-credits-work"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition hover:bg-surface hover:text-foreground"
              >
                <HelpCircle className="size-3.5 shrink-0" strokeWidth={1.75} />
                How credits work
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, displayName, avatarUrl }: {
  msg: { role: string; content?: string; parts?: UIMessage["parts"] };
  displayName: string;
  avatarUrl?: string | null;
}) {
  const text = messageText(msg);
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("group flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div className="shrink-0 pt-0.5">
        {isUser ? (
          <Avatar src={avatarUrl} name={displayName} size="sm" />
        ) : (
          <div className="flex size-7 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20">
            <Sparkles className="size-3.5 text-accent" strokeWidth={1.75} />
          </div>
        )}
      </div>
      <div className={cn("flex max-w-[75%] flex-col gap-1", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed",
            isUser
              ? "rounded-tr-sm bg-accent text-white"
              : "rounded-tl-sm bg-surface ring-1 ring-border text-foreground",
          )}
        >
          <div className="whitespace-pre-wrap">{text}</div>
        </div>
        {!isUser && (
          <div className="flex items-center gap-1.5">
            <MessageActionMenu text={text} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main ChatView ────────────────────────────────────────────────────────────

export function ChatView() {
  const supabase = createClient();
  const { profile } = useAuthStore();
  const { remaining, deductOptimistic } = useCreditsStore();

  const [activeConvId, setActiveConvId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const [creditError, setCreditError] = React.useState(false);
  const [showCreditsModal, setShowCreditsModal] = React.useState(false);
  const [input, setInput] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const { conversations, setConversations, loading: convLoading } = useConversations(profile?.id);
  const { history, loading: histLoading } = useMessages(activeConvId, profile?.id);

  const convRef = React.useRef(activeConvId);
  convRef.current = activeConvId;

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: "/api/chat",
        fetch: async (reqInput, init) => {
          const res = await globalThis.fetch(reqInput as RequestInfo, init);
          if (res.status === 402) setCreditError(true);
          else {
            setCreditError(false);
            if (res.ok) deductOptimistic(CREDITS_PER_MESSAGE);
          }
          return res;
        },
        prepareSendMessagesRequest: ({ id, messages: reqMessages, body, trigger, messageId }) => ({
          body: {
            ...(body ?? {}),
            id,
            messages: reqMessages,
            trigger,
            messageId,
            modelId: AUTO_MODEL_ID,
            mode: "discuss",
            conversationId: convRef.current ?? undefined,
          },
        }),
      }),
    [deductOptimistic],
  );

  const { messages, sendMessage, regenerate, status, error, setMessages, clearError } = useChat({ transport });
  const isBusy = status === "submitted" || status === "streaming";

  React.useEffect(() => {
    setMessages(
      history.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        parts: [{ type: "text" as const, text: m.content }],
      })),
    );
  }, [history, activeConvId, setMessages]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBusy]);

  function startNewConversation() {
    setActiveConvId(null);
    convRef.current = null;
    setInput("");
    setMessages([]);
    setCreditError(false);
  }

  const filteredConvs = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Conversation sidebar */}
      <div className="hidden w-64 shrink-0 flex-col border-r border-border bg-background lg:flex">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations"
              className="h-8 w-full rounded-lg bg-surface pl-8 pr-3 text-[12px] text-foreground outline-none ring-1 ring-border focus:ring-accent/40"
            />
          </div>
          <button
            onClick={startNewConversation}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground ring-1 ring-border transition hover:bg-surface hover:text-foreground active:scale-95"
            title="New conversation"
          >
            <Plus className="size-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {convLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <MessageSquare className="mx-auto mb-2 size-8 text-muted-foreground/30" strokeWidth={1.25} />
              <p className="text-[12px] text-muted-foreground">No conversations yet</p>
              <p className="mt-1 text-[11px] text-muted-foreground/60">Ask your first question above</p>
            </div>
          ) : (
            filteredConvs.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={cn(
                  "group w-full cursor-pointer px-3 py-2.5 text-left transition hover:bg-surface",
                  activeConvId === conv.id && "bg-surface",
                )}
              >
                <p className={cn(
                  "truncate text-[12.5px] font-medium leading-snug",
                  activeConvId === conv.id ? "text-foreground" : "text-foreground/80",
                )}>
                  {conv.title}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {new Date(conv.updated_at).toLocaleDateString()}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Link to create a new app */}
        <div className="border-t border-border p-3">
          <Link
            href="/"
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12px] font-medium text-white transition hover:bg-accent/90 active:scale-[0.98]"
          >
            <Sparkles className="size-3.5" strokeWidth={1.75} />
            Create a new app
          </Link>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Chat label bar */}
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-4">
          <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground ring-1 ring-border/60">
            <Sparkles className="size-3 text-accent" strokeWidth={1.75} />
            AI Assistant · Auto routing
          </div>
          <span className="ml-auto text-[11px] text-muted-foreground/50">
            Questions, debugging, architecture help
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
            {messages.length === 0 && !isBusy && (
              <motion.div
                variants={variants.fadeUp}
                initial="hidden"
                animate="show"
                className="flex flex-col items-center py-16 text-center"
              >
                <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/20">
                  <Sparkles className="size-7 text-accent" strokeWidth={1.5} />
                </div>
                <h2 className="text-[20px] font-semibold tracking-tight text-foreground">
                  How can I help?
                </h2>
                <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                  Ask me anything — code questions, architecture, debugging, or learning.
                  For building apps, use the{" "}
                  <Link href="/" className="text-accent hover:underline underline-offset-2">
                    Create page
                  </Link>
                  .
                </p>
                <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    "Explain how React state works",
                    "How do I set up Supabase auth?",
                    "What's the difference between RSC and client components?",
                    "Debug a slow database query",
                  ].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setInput(q)}
                      className="cursor-pointer rounded-xl border border-border bg-surface px-4 py-3 text-left text-[12.5px] text-muted-foreground transition hover:border-accent/30 hover:bg-surface hover:text-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {histLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              messages.map((msg, idx) => (
                <MessageBubble
                  key={msg.id ?? idx}
                  msg={{ role: msg.role, parts: msg.parts }}
                  displayName={profile?.full_name ?? "You"}
                  avatarUrl={profile?.avatar_url}
                />
              ))
            )}

            {isBusy && (
              <div className="flex gap-3">
                <div className="flex size-7 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20">
                  <Sparkles className="size-3.5 text-accent" strokeWidth={1.75} />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-surface px-4 py-3 ring-1 ring-border">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {(error || creditError) && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 rounded-xl bg-destructive/10 px-4 py-3 ring-1 ring-destructive/20"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" strokeWidth={1.75} />
                <div>
                  <p className="text-[13px] font-medium text-destructive">
                    {creditError ? "Insufficient credits" : "Something went wrong"}
                  </p>
                  <p className="mt-0.5 text-[12px] text-destructive/70">
                    {creditError
                      ? "Upgrade your plan or wait for your credits to reset."
                      : "The AI is temporarily unavailable. Try again."}
                  </p>
                </div>
                {!creditError && (
                  <button
                    onClick={() => { clearError(); void regenerate(); }}
                    className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] text-destructive transition hover:bg-destructive/10"
                  >
                    <RotateCcw className="size-3.5" strokeWidth={1.75} /> Retry
                  </button>
                )}
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-border bg-background/80 px-4 pb-4 pt-3 backdrop-blur-xl">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1 text-[12px] ring-1 ring-border">
                  <Paperclip className="size-3" strokeWidth={1.75} />
                  <span className="max-w-[120px] truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachments((a) => a.filter((_, j) => j !== i))}
                    className="cursor-pointer"
                  >
                    <X className="size-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const text = input.trim();
              if (!text || isBusy || remaining < CREDITS_PER_MESSAGE || !profile?.id) return;

              let convId = activeConvId;
              if (!convId) {
                const title = text.slice(0, 60) || "New Conversation";
                const { data: conv } = await supabase
                  .from("conversations")
                  .insert({ user_id: profile.id, title, model_id: AUTO_MODEL_ID })
                  .select()
                  .single();
                if (conv) {
                  convId = conv.id;
                  setActiveConvId(conv.id);
                  convRef.current = conv.id;
                  setConversations((prev) => [conv as Conversation, ...prev]);
                }
              } else {
                convRef.current = convId;
              }

              setCreditError(false);
              setInput("");
              await sendMessage({ text });
            }}
            className="flex items-end gap-2 rounded-2xl bg-surface px-3 py-2 ring-1 ring-border transition focus-within:ring-accent/40"
          >
            <input
              type="file"
              ref={fileRef}
              className="hidden"
              multiple
              accept="image/*,.pdf,.txt,.zip,.json"
              onChange={(e) => setAttachments((a) => [...a, ...Array.from(e.target.files ?? [])])}
            />

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title="Attach a file or image"
              className="mb-1 cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-background hover:text-foreground active:scale-95"
            >
              <Paperclip className="size-4" strokeWidth={1.65} />
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Ask anything…"
              rows={1}
              disabled={isBusy}
              className="max-h-36 flex-1 resize-none bg-transparent py-1 text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
              style={{ lineHeight: "1.5" }}
            />

            <Button
              variant="accent"
              size="sm"
              type="submit"
              disabled={isBusy || !input.trim() || remaining < CREDITS_PER_MESSAGE}
              className="mb-0.5 shrink-0 px-3"
            >
              {isBusy
                ? <Loader2 className="size-3.5 animate-spin" />
                : <Send className="size-3.5" strokeWidth={2} />}
            </Button>
          </form>

          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            {remaining < CREDITS_PER_MESSAGE
              ? <>Not enough credits —{" "}
                <button
                  type="button"
                  onClick={() => setShowCreditsModal(true)}
                  className="cursor-pointer text-accent hover:underline underline-offset-2"
                >
                  upgrade your plan
                </button>
              </>
              : "Enter to send · Shift+Enter for new line"}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {showCreditsModal && (
          <CreditsUpgradeModal
            onClose={() => setShowCreditsModal(false)}
            currentPlanId={profile?.plan_id ?? "free"}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

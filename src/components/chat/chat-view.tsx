"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Send, Paperclip, Sparkles, X, AlertCircle,
  Loader2, Copy, Check, RotateCcw, MoreHorizontal,
  Link2, HelpCircle, MessageSquare, Bot,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { appUrl, getPublicSiteUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useCreditsStore } from "@/lib/stores/credits-store";
import type { Conversation, Message } from "@/lib/supabase/types";
import { variants } from "@/lib/motion";
import { CreditsUpgradeModal } from "@/components/chat/credits-upgrade-modal";
import { calculateTokens } from "@/lib/credits/cost-engine";
import { resolveDisplayName } from "@/lib/profile-display";
import { toast } from "@/lib/toast";
import { createDreamChatTransport } from "@/lib/chat/create-chat-transport";
import { resolveClientUserId } from "@/lib/chat/resolve-client-user";
import { applyComposerPaste } from "@/lib/composer/textarea-handlers";
import { composerTextareaClass } from "@/components/ui/composer-shell";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { submitDebug } from "@/lib/dev/submit-debug";
import { ComposerDebugStrip } from "@/components/dev/composer-debug-strip";

const DISCUSS_MODEL_ID_FREE = "gpt-4o-mini";

export type ChatAttachment = { id?: string; url?: string; mime?: string; name?: string };

function parseAttachments(raw: unknown): ChatAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (x): x is ChatAttachment =>
      !!x &&
      typeof x === "object" &&
      "url" in x &&
      typeof (x as ChatAttachment).url === "string",
  );
}

function planIsFree(planId: string | null | undefined): boolean {
  if (!planId) return true;
  const p = planId.toLowerCase();
  return p === "free" || p === "starter";
}

// ─── Data hooks ───────────────────────────────────────────────────────────────

function useConversations(userId: string | undefined) {
  const supabase = createClient();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const maxWait = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 1000);

    void Promise.resolve(
      supabase
        .from("conversations")
        .select("*")
        .eq("user_id", userId)
        .eq("archived", false)
        .order("updated_at", { ascending: false })
        .limit(50),
    )
      .then(({ data, error }) => {
        if (cancelled) return;
        setConversations(error ? [] : (data ?? []));
      })
      .finally(() => {
        if (!cancelled) {
          clearTimeout(maxWait);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(maxWait);
    };
  }, [userId]);

  return { conversations, setConversations, loading };
}

function useMessages(conversationId: string | null, userId: string | undefined, reloadTick: number) {
  const supabase = createClient();
  const [history, setHistory] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!conversationId || !userId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const maxWait = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 1000);

    void Promise.resolve(
      supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),
    )
      .then(({ data, error }) => {
        if (cancelled) return;
        setHistory(error ? [] : ((data as Message[]) ?? []));
      })
      .finally(() => {
        if (!cancelled) {
          clearTimeout(maxWait);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(maxWait);
    };
  }, [conversationId, userId, reloadTick]);

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
  const pathname = usePathname();
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
                onClick={() => {
                  const base = getPublicSiteUrl();
                  const pathAndQuery =
                    typeof window !== "undefined"
                      ? `${window.location.pathname}${window.location.search}`
                      : pathname || "/chat";
                  navigator.clipboard.writeText(`${base}${pathAndQuery}`).catch(() => {});
                  setOpen(false);
                }}
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
                How tokens work
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, displayName, avatarUrl, attachments = [] }: {
  msg: { role: string; content?: string; parts?: UIMessage["parts"] };
  displayName: string;
  avatarUrl?: string | null;
  attachments?: ChatAttachment[];
}) {
  const text = messageText(msg);
  const isUser = msg.role === "user";
  const images = attachments.filter((a) => a.mime?.startsWith("image/"));
  const files = attachments.filter((a) => !a.mime?.startsWith("image/"));
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn("group flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div className="shrink-0 pt-0.5">
        {isUser ? (
          <div className="rounded-full ring-2 ring-accent/20">
            <Avatar src={avatarUrl} name={displayName} size="sm" />
          </div>
        ) : (
          <div className="flex size-8 items-center justify-center rounded-2xl bg-gradient-to-br from-accent via-accent to-blue-600 text-white shadow-[0_6px_20px_-6px_color-mix(in_oklab,var(--accent)_55%,transparent)] ring-2 ring-white/40">
            <Sparkles className="size-4" strokeWidth={1.85} />
          </div>
        )}
      </div>
      <div className={cn("flex max-w-[min(100%,560px)] flex-col gap-1.5", isUser && "items-end")}>
        <div
          className={cn(
            "relative overflow-hidden px-4 py-3 text-[14px] leading-relaxed shadow-sm",
            isUser
              ? "rounded-2xl rounded-tr-md bg-gradient-to-br from-accent to-blue-600 text-white"
              : "rounded-2xl rounded-tl-md border border-border/60 bg-gradient-to-b from-background to-surface/95 text-foreground ring-1 ring-accent/10",
          )}
        >
          {!isUser && (
            <span
              className="pointer-events-none absolute inset-0 opacity-[0.55]"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in oklab, var(--accent) 10%, transparent) 0%, transparent 50%)",
              }}
              aria-hidden
            />
          )}
          <div className={cn("relative whitespace-pre-wrap", !isUser && "text-foreground/95")}>{text}</div>
          {images.length > 0 && (
            <div className={cn("relative mt-2 flex flex-wrap gap-2", isUser ? "justify-end" : "justify-start")}>
              {images.map((a) => (
                <a
                  key={a.id ?? a.url}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block max-w-[min(100%,280px)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- raw PNG alpha */}
                  <img
                    src={a.url}
                    alt={a.name ?? ""}
                    className="max-h-56 w-full rounded-lg object-contain"
                  />
                </a>
              ))}
            </div>
          )}
          {files.length > 0 && (
            <ul className={cn("relative mt-2 list-disc space-y-0.5 pl-4 text-[12px]", isUser ? "text-white/90" : "text-muted-foreground")}>
              {files.map((a) => (
                <li key={a.id ?? a.url}>
                  <a href={a.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                    {a.name ?? "Attachment"}
                  </a>
                </li>
              ))}
            </ul>
          )}
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
  const { profile, user, session, loading: authLoading } = useAuthStore();
  const hydrated = useHydrated();
  const { remaining, syncFromDB, isConfirmed } = useCreditsStore();
  const freePlan = planIsFree(profile?.plan_id);
  const [paidDiscussModel, setPaidDiscussModel] = React.useState("claude-sonnet-4-6");
  const effectiveDiscussModel = freePlan ? DISCUSS_MODEL_ID_FREE : paidDiscussModel;
  const discussTokens = React.useMemo(
    () => calculateTokens(effectiveDiscussModel, "discuss"),
    [effectiveDiscussModel],
  );
  /** Block sends only after server confirmed balance; avoids false zero before /api/credits hydrates. */
  const tokenBlocked = isConfirmed && remaining < discussTokens;
  const userId = user?.id ?? profile?.id;
  const sessionReady = hydrated && !authLoading;
  const needsSignIn = sessionReady && !session?.user;

  const [activeConvId, setActiveConvId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [attachments, setAttachments] = React.useState<File[]>([]);
  const [tokenError, setTokenError] = React.useState(false);
  const [showCreditsModal, setShowCreditsModal] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [lastSubmitAt, setLastSubmitAt] = React.useState<number | null>(null);
  const [lastApiStatus, setLastApiStatus] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const pendingAttachmentIdsRef = React.useRef<string[]>([]);

  const [histReload, setHistReload] = React.useState(0);
  const { conversations, setConversations, loading: convLoading } = useConversations(userId);
  const { history, loading: histLoading } = useMessages(activeConvId, userId, histReload);

  const convRef = React.useRef(activeConvId);
  convRef.current = activeConvId;

  /** Stable for component lifetime — never tie to activeConvId or send wipes mid-flight. */
  const chatSessionId = React.useId();

  const histById = React.useMemo(() => new Map(history.map((m) => [m.id, m])), [history]);

  const discussModelRef = React.useRef(effectiveDiscussModel);
  discussModelRef.current = effectiveDiscussModel;

  const transport = React.useMemo(
    () =>
      createDreamChatTransport({
        label: "ai-chat",
        getBody: () => ({
          modelId: discussModelRef.current,
          mode: "discuss",
          conversationId: convRef.current ?? undefined,
          attachmentIds: [...pendingAttachmentIdsRef.current],
        }),
        on402: () => {
          pendingAttachmentIdsRef.current = [];
          setTokenError(true);
        },
        onSuccess: () => {
          setTokenError(false);
        },
      }),
    [],
  );

  const { messages, sendMessage, regenerate, status, error, setMessages, clearError } = useChat({
    id: `dream-ai-chat-${chatSessionId}`,
    transport,
    onError: (err) => {
      pendingAttachmentIdsRef.current = [];
      if (process.env.NODE_ENV !== "production") {
        console.error("[ai-chat] stream error", err);
      }
      toast.error(err.message ?? "Chat failed — try again.");
    },
    onFinish: () => {
      pendingAttachmentIdsRef.current = [];
      if (userId) void syncFromDB(userId, { force: true });
    },
  });
  const isBusy = status === "submitted" || status === "streaming";

  React.useEffect(() => {
    submitDebug("chat", "composer mounted");
    if (!userId) return;
    void syncFromDB(userId);
  }, [userId, syncFromDB]);

  const trimmedInput = input.trim();
  const submitDisabledReason = !trimmedInput
    ? "empty"
    : isBusy
      ? "busy"
      : needsSignIn
        ? "sign-in"
        : tokenBlocked
          ? "tokens"
          : null;

  const tokensStatus = !isConfirmed
    ? "loading"
    : tokenBlocked
      ? "blocked"
      : `${remaining}`;

  const wasBusyRef = React.useRef(false);
  React.useEffect(() => {
    if (wasBusyRef.current && !isBusy && activeConvId) {
      setHistReload((n) => n + 1);
    }
    wasBusyRef.current = isBusy;
  }, [isBusy, activeConvId]);

  React.useEffect(() => {
    if (!activeConvId) return;
    if (histLoading || isBusy) return;
    // Do not replace live `useChat` messages with an empty history (brand-new thread + first reply race).
    if (history.length === 0) return;
    setMessages(
      history.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        parts: [{ type: "text" as const, text: m.content }],
      })),
    );
  }, [history, activeConvId, histLoading, isBusy, setMessages]);

  React.useEffect(() => {
    if (messages.length === 0 && !isBusy) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isBusy, activeConvId]);

  function startNewConversation() {
    setActiveConvId(null);
    convRef.current = null;
    setInput("");
    setMessages([]);
    setTokenError(false);
    pendingAttachmentIdsRef.current = [];
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  const filteredConvs = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  );

  function notifySubmitBlocked(reason: string) {
    submitDebug("chat", `blocked: ${reason}`);
    if (reason === "tokens") {
      toast.error("Not enough tokens for this message.");
      setShowCreditsModal(true);
    } else if (reason === "sign-in") {
      toast.error(`Please sign in again at ${appUrl("/auth/login")}.`);
    } else if (reason === "busy") {
      toast.error("Please wait for the current reply to finish.");
    }
  }

  async function handleSend(e?: React.FormEvent, presetText?: string) {
    e?.preventDefault();
    setLastSubmitAt(Date.now());
    submitDebug("chat", "submit handler started", {
      source: presetText ? "preset" : e ? "form" : "button",
      chars: (presetText ?? input).trim().length,
    });
    const text = (presetText ?? input).trim();
    if (!text) {
      notifySubmitBlocked("empty");
      return;
    }
    if (isBusy) {
      notifySubmitBlocked("busy");
      return;
    }
    if (needsSignIn) {
      notifySubmitBlocked("sign-in");
      return;
    }
    if (tokenBlocked) {
      notifySubmitBlocked("tokens");
      return;
    }

    const uid = await resolveClientUserId(supabase, user, profile);
    if (!uid) {
      toast.error("Please sign in again.");
      return;
    }

    let convId = activeConvId;
    let createdConv: Conversation | null = null;
    if (!convId) {
      const title = text.slice(0, 60) || "New conversation";
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({ user_id: uid, title, model_id: effectiveDiscussModel })
        .select()
        .single();
      if (convErr || !conv) {
        const detail = convErr?.message ?? "Check Supabase conversations table and RLS.";
        toast.error(`Could not start a conversation — ${detail}`);
        return;
      }
      convId = conv.id;
      convRef.current = conv.id;
      createdConv = conv as Conversation;
    } else {
      convRef.current = convId;
    }

    const uploadIds: string[] = [];
    if (attachments.length > 0) {
      for (const f of attachments) {
        const fd = new FormData();
        fd.append("file", f);
        const r = await fetch("/api/chat/attachments", { method: "POST", body: fd });
        const j = (await r.json()) as { id?: string; error?: string };
        if (!r.ok) {
          toast.error(j.error ?? "Could not upload attachment");
          return;
        }
        if (j.id) uploadIds.push(j.id);
      }
      setAttachments([]);
    }
    pendingAttachmentIdsRef.current = uploadIds;

    setTokenError(false);
    clearError();
    const draft = presetText ?? input;
    if (!presetText) setInput("");

    submitDebug("chat", "fetch /api/chat started", { convId });
    setLastApiStatus("pending");
    try {
      await sendMessage({ text });
      setLastApiStatus("ok");
      if (createdConv) {
        setActiveConvId(createdConv.id);
        setConversations((prev) => [createdConv, ...prev]);
      }
      if (process.env.NODE_ENV !== "production") {
        console.info("[ai-chat] sendMessage done");
      }
    } catch (err) {
      setLastApiStatus("error");
      const msg = err instanceof Error ? err.message : "Could not send message";
      if (!msg.includes("Not enough tokens")) toast.error(msg);
      if (!presetText) setInput(draft);
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full overflow-hidden">
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
              <p className="text-[12px] font-medium text-foreground">No conversations yet</p>
              <p className="mt-1 text-[11px] text-muted-foreground/80">Start a new chat below — it saves automatically.</p>
              <button
                type="button"
                onClick={startNewConversation}
                className="mt-4 w-full cursor-pointer rounded-lg bg-accent px-3 py-2 text-[12px] font-medium text-white transition hover:bg-accent/90 active:scale-[0.98]"
              >
                Start a new chat
              </button>
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3 lg:hidden">
          <button
            type="button"
            onClick={startNewConversation}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-accent text-white shadow-sm transition hover:bg-accent/90 active:scale-95"
            title="New chat"
          >
            <Plus className="size-4" strokeWidth={2} />
          </button>
          <span className="text-[12px] font-medium text-foreground">New chat</span>
        </div>
        {/* Chat label bar */}
        <div className="flex h-10 shrink-0 flex-wrap items-center gap-2 border-b border-border px-4">
          <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground ring-1 ring-border/60">
            <Sparkles className="size-3 text-accent" strokeWidth={1.75} />
            {freePlan ? "Discuss · automatic model" : "Discuss · choose model"}
          </div>
          {!freePlan && (
            <select
              value={paidDiscussModel}
              onChange={(e) => setPaidDiscussModel(e.target.value)}
              aria-label="Model"
              className="rounded-lg border border-border/80 bg-background px-2 py-1 text-[11px] text-foreground outline-none"
            >
              <option value="claude-sonnet-4-6">Claude Sonnet</option>
              <option value="claude-haiku-4-5">Claude Haiku</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o mini</option>
            </select>
          )}
          <span className="ml-auto hidden text-[11px] text-muted-foreground/60 sm:inline">
            Friendly answers about DreamOS86 — no coding jargon unless you want it
          </span>
        </div>

        {/* Messages */}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4 sm:px-5 lg:px-6">
            {messages.length === 0 && !isBusy && (
              <motion.div
                variants={variants.fadeUp}
                initial="hidden"
                animate="show"
                className="flex flex-col items-center py-8 text-center sm:py-10"
              >
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/25 via-accent/15 to-violet-500/20 ring-1 ring-accent/25 shadow-[0_8px_28px_-12px_rgba(37,99,235,0.22)]">
                  <Bot className="size-8 text-accent" strokeWidth={1.35} />
                </div>
                <h2 className="text-[20px] font-semibold tracking-tight text-foreground">
                  How can I help?
                </h2>
                <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted-foreground">
                  Ask how DreamOS86 works, what to build first, or where to find pricing and settings. Short, plain-language answers.
                </p>
                <div className="mt-6 flex w-full max-w-xl flex-col gap-2">
                  {[
                    { q: "What is DreamOS86 in one sentence?", prompt: "What is DreamOS86 in one sentence?" },
                    { q: "How do I build my first app here?", prompt: "How do I build my first app step by step?" },
                    { q: "Where do tokens and pricing work?", prompt: "How do tokens work and where is pricing?" },
                    { q: "Can you link me to templates and examples?", prompt: "Where are templates and example apps?" },
                  ].map(({ q, prompt }) => (
                    <button
                      key={q}
                      type="button"
                      disabled={isBusy || tokenBlocked || !userId}
                      onClick={() => {
                        setInput(prompt);
                        requestAnimationFrame(() => textareaRef.current?.focus());
                      }}
                      className="cursor-pointer rounded-xl border border-border/80 bg-background/80 px-4 py-3 text-left text-[12.5px] text-muted-foreground shadow-sm transition hover:border-accent/35 hover:bg-surface hover:text-foreground hover:shadow-md active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {histLoading && messages.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              messages.map((msg, idx) => {
                const row = msg.id ? histById.get(msg.id) : undefined;
                const att = parseAttachments(row?.attachments);
                return (
                  <MessageBubble
                    key={msg.id ?? idx}
                    msg={{ role: msg.role, parts: msg.parts }}
                    displayName={resolveDisplayName(profile, user)}
                    avatarUrl={profile?.avatar_url}
                    attachments={att}
                  />
                );
              })
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

            {(error || tokenError) && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 rounded-xl bg-destructive/10 px-4 py-3 ring-1 ring-destructive/20"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" strokeWidth={1.75} />
                <div>
                  <p className="text-[13px] font-medium text-destructive">
                    {tokenError ? "Not enough tokens" : "Something went wrong"}
                  </p>
                  <p className="mt-0.5 text-[12px] text-destructive/70">
                    {tokenError
                      ? "Add tokens or upgrade your plan to keep chatting."
                      : error?.message ?? "The AI is temporarily unavailable. Try again."}
                  </p>
                </div>
                {!tokenError && (
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
        <div className="shrink-0 border-t border-border/60 bg-background/90 px-3 pt-2.5 backdrop-blur-xl pb-[max(0.875rem,calc(4rem+env(safe-area-inset-bottom,0px)))] lg:pb-3">
          {attachments.length > 0 && (
            <div className="mx-auto mb-2 flex w-full max-w-3xl flex-wrap gap-2">
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
            ref={formRef}
            onSubmit={(e) => void handleSend(e)}
            className="composer-shell relative z-10 mx-auto flex w-full max-w-3xl items-end gap-2 rounded-xl border border-border/70 bg-surface/80 px-2 py-1.5 shadow-sm transition-[border-color,box-shadow] focus-within:border-border focus-within:shadow-sm"
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
              className="-translate-y-0.5 mb-0.5 cursor-pointer rounded-lg p-1.5 text-muted-foreground transition hover:bg-background hover:text-foreground active:scale-95"
            >
              <Paperclip className="size-4" strokeWidth={1.65} />
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                submitDebug("chat", "input changed", { len: e.target.value.length });
              }}
              onPaste={(e) => applyComposerPaste(e, input, setInput)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submitDebug("chat", "enter pressed");
                  formRef.current?.requestSubmit();
                }
              }}
              placeholder="Ask anything…"
              rows={1}
              disabled={isBusy}
              spellCheck
              className={cn(
                composerTextareaClass,
                "max-h-36 min-h-[36px] flex-1 py-2 text-[13.5px] leading-relaxed",
              )}
            />

            <button
              type="submit"
              aria-disabled={!!submitDisabledReason}
              onPointerDown={() => submitDebug("chat", "send button clicked")}
              onClick={() => {
                if (submitDisabledReason) notifySubmitBlocked(submitDisabledReason);
              }}
              className={cn(
                "mb-1 inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] bg-accent px-3 text-accent-foreground shadow-[var(--shadow-sm)] transition hover:brightness-[1.03] active:scale-[0.97]",
                submitDisabledReason && "cursor-not-allowed opacity-45",
              )}
              title={
                tokenBlocked
                  ? "Not enough tokens — upgrade to continue"
                  : needsSignIn
                    ? "Sign in to send"
                    : submitDisabledReason === "busy"
                      ? "Waiting for reply"
                      : undefined
              }
            >
              {isBusy
                ? <Loader2 className="size-3.5 animate-spin" />
                : <Send className="size-3.5" strokeWidth={2} />}
            </button>
          </form>

          <ComposerDebugStrip
            channel="chat"
            inputLen={input.length}
            disabledReason={submitDisabledReason}
            tokensStatus={tokensStatus}
            lastSubmitAt={lastSubmitAt}
            lastApiStatus={lastApiStatus}
          />

          <p className="mx-auto mt-1.5 max-w-3xl text-center text-[11px] text-muted-foreground">
            {needsSignIn
              ? `Please sign in again at ${appUrl("/auth/login")} (same origin as this tab) to send messages.`
              : tokenBlocked
                ? <>Not enough tokens —{" "}
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

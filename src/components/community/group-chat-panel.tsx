"use client";

import * as React from "react";
import { Loader2, Send, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type MessageRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  author_name?: string;
  author_avatar?: string | null;
};

type TypingUser = { userId: string; name: string };

export function GroupChatPanel({
  groupId,
  joined,
}: {
  groupId: string;
  joined: boolean;
}) {
  const supabase = createClient();
  const { user, profile } = useAuthStore();
  const [messages, setMessages] = React.useState<MessageRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [typingUsers, setTypingUsers] = React.useState<TypingUser[]>([]);
  const [lastReadAt, setLastReadAt] = React.useState<string | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const typingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = React.useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadMessages = React.useCallback(async () => {
    const { data, error } = await supabase
      .from("group_messages" as never)
      .select("id, body, created_at, user_id")
      .eq("group_id" as never, groupId)
      .eq("is_deleted" as never, false)
      .order("created_at", { ascending: true })
      .limit(80);
    if (error) {
      setMessages([]);
      return;
    }
    setMessages((data ?? []) as unknown as MessageRow[]);
  }, [groupId, supabase]);

  const markRead = React.useCallback(async () => {
    if (!user || !joined) return;
    const now = new Date().toISOString();
    setLastReadAt(now);
    await supabase
      .from("group_members" as never)
      .update({ last_read_at: now } as never)
      .eq("group_id" as never, groupId)
      .eq("user_id" as never, user.id);
  }, [groupId, joined, supabase, user]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      await loadMessages();
      if (!cancelled) setLoading(false);
      void markRead();
    })();

    const channel = supabase.channel(`group-chat:${groupId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
        (payload) => {
          const row = payload.new as MessageRow;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
          void markRead();
        },
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        const p = payload.payload as { userId?: string; name?: string };
        if (!p.userId || p.userId === user?.id) return;
        setTypingUsers((prev) => {
          const filtered = prev.filter((t) => t.userId !== p.userId);
          return [...filtered, { userId: p.userId!, name: p.name ?? "Someone" }];
        });
        window.setTimeout(() => {
          setTypingUsers((prev) => prev.filter((t) => t.userId !== p.userId));
        }, 2800);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [groupId, loadMessages, markRead, supabase, user?.id]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typingUsers.length]);

  function broadcastTyping() {
    if (!user || !joined || !channelRef.current) return;
    void channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id, name: profile?.full_name ?? "Member" },
    });
  }

  function onInputChange(value: string) {
    setBody(value);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => broadcastTyping(), 200);
  }

  async function send() {
    const text = body.trim();
    if (!text || !user || !joined) return;
    setSending(true);
    const optimistic: MessageRow = {
      id: `opt-${Date.now()}`,
      body: text,
      created_at: new Date().toISOString(),
      user_id: user.id,
      author_name: profile?.full_name ?? "You",
    };
    setMessages((prev) => [...prev, optimistic]);
    setBody("");
    try {
      const { data, error } = await supabase
        .from("group_messages" as never)
        .insert({ group_id: groupId, user_id: user.id, body: text } as never)
        .select("id, body, created_at, user_id")
        .single();
      if (error) throw error;
      const row = data as unknown as MessageRow;
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? { ...row, author_name: "You" } : m)));
      void markRead();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setBody(text);
      toast.error("Could not send message");
    } finally {
      setSending(false);
    }
  }

  if (!joined) {
    return (
      <div className="rounded-2xl bg-surface px-4 py-8 text-center ring-1 ring-border">
        <p className="text-[13px] text-muted-foreground">Join this group to send messages.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[min(420px,60vh)] flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-border" data-testid="group-chat-panel">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-[11px] font-semibold text-muted-foreground">Group chat</p>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Realtime</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        {loading ? (
          <ul className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="h-12 animate-pulse rounded-2xl bg-muted/40" />
            ))}
          </ul>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-[12px] text-muted-foreground">No messages yet — say hello.</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => {
              const mine = m.user_id === user?.id;
              const read = mine && lastReadAt && new Date(m.created_at) <= new Date(lastReadAt);
              return (
                <li key={m.id} className={cn("flex gap-2", mine && "flex-row-reverse")}>
                  <Avatar name={m.author_name ?? "Member"} src={m.author_avatar} size="sm" />
                  <div className={cn("max-w-[78%] rounded-2xl px-3 py-2 text-[13px]", mine ? "bg-accent text-white" : "bg-muted/50 text-foreground")}>
                    <p>{m.body}</p>
                    <div className={cn("mt-1 flex items-center gap-1 text-[9px] opacity-70", mine ? "justify-end text-white/80" : "text-muted-foreground")}>
                      <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {mine && read ? <CheckCheck className="size-3" /> : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      {typingUsers.length > 0 ? (
        <p className="px-3 pb-1 text-[11px] text-muted-foreground">
          {typingUsers.map((t) => t.name).join(", ")} typing…
        </p>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex gap-2 border-t border-border px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
      >
        <input
          value={body}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Message the group…"
          className="min-w-0 flex-1 rounded-xl bg-background px-3 py-2.5 text-[13px] ring-1 ring-border"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="rounded-xl bg-accent px-3 py-2.5 text-white disabled:opacity-50"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

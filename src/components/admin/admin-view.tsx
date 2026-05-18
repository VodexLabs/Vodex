"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Users, Zap, Shield, Ticket, Search,
  Loader2, Check, AlertCircle, Lock, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { variants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";
import { AuthHealthPanel } from "@/components/admin/auth-health-panel";

type Tab = "users" | "credits" | "tickets" | "audit" | "auth";

function GrantCreditsForm({ userId, userName }: { userId: string; userName: string }) {
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<"success" | "error" | null>(null);

  async function grant() {
    if (!amount || !reason) return;
    setLoading(true);
    const res = await fetch("/api/admin/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount: parseInt(amount), reason }),
    });
    setResult(res.ok ? "success" : "error");
    setLoading(false);
    if (res.ok) { setAmount(""); setReason(""); }
  }

  return (
    <div className="space-y-3 rounded-lg bg-background p-4 ring-1 ring-border">
      <p className="text-[12px] font-semibold text-foreground">Grant credits to {userName}</p>
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-24"
          min="1"
          max="100000"
        />
        <Input
          placeholder="Reason (required)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="flex-1"
        />
        <Button
          variant="accent"
          size="sm"
          onClick={grant}
          disabled={loading || !amount || !reason}
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : "Grant"}
        </Button>
      </div>
      {result === "success" && (
        <p className="flex items-center gap-1 text-[12px] text-positive">
          <Check className="size-3.5" /> Credits granted successfully
        </p>
      )}
      {result === "error" && (
        <p className="flex items-center gap-1 text-[12px] text-destructive">
          <AlertCircle className="size-3.5" /> Failed to grant credits
        </p>
      )}
    </div>
  );
}

export function AdminView() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = React.useState<Tab>("users");
  const [users, setUsers] = React.useState<Profile[]>([]);
  const [tickets, setTickets] = React.useState<unknown[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<unknown[]>([]);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [grantTarget, setGrantTarget] = React.useState<{ id: string; name: string } | null>(null);

  const loadUsers = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setUsers((data as Profile[]) ?? []);
    setLoading(false);
  }, [supabase]);

  const loadTickets = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("support_tickets")
      .select("*, profiles(full_name, email, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(50);
    setTickets(data ?? []);
    setLoading(false);
  }, [supabase]);

  const loadAuditLogs = React.useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setAuditLogs(data ?? []);
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    if (activeTab === "users") loadUsers();
    if (activeTab === "tickets") loadTickets();
    if (activeTab === "audit") loadAuditLogs();
  }, [activeTab, loadUsers, loadTickets, loadAuditLogs]);

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "users", label: "Users", icon: Users },
    { id: "credits", label: "Credits", icon: Zap },
    { id: "tickets", label: "Support", icon: Ticket },
    { id: "audit", label: "Audit Log", icon: Shield },
    { id: "auth", label: "Auth Health", icon: ShieldCheck },
  ];

  const filteredUsers = users.filter(
    (u) =>
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <motion.div variants={variants.fadeUp} initial="hidden" animate="show">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex size-8 items-center justify-center rounded-lg bg-destructive/10 ring-1 ring-destructive/20">
            <Lock className="size-4 text-destructive" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-[18px] font-semibold text-foreground">Admin Panel</h1>
            <p className="text-[12px] text-muted-foreground">Restricted — dreamos86app@gmail.com only</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-surface p-1 ring-1 ring-border w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <tab.icon className="size-3.5" strokeWidth={1.75} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {activeTab === "users" && (
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <Input
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-[var(--radius-xl)] bg-surface ring-1 ring-border overflow-hidden">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>User</span>
                <span>Plan</span>
                <span>Credits</span>
                <span>Joined</span>
                <span>Actions</span>
              </div>
              {filteredUsers.map((u) => (
                <div key={u.id}>
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-border/50 px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={u.full_name ?? u.email} src={u.avatar_url} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium text-foreground">
                          {u.full_name ?? "—"}
                          {u.is_admin && <span className="ml-1.5 text-[10px] text-accent">[admin]</span>}
                          {u.suspended_at && <span className="ml-1.5 text-[10px] text-destructive">[suspended]</span>}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <span className="text-[12px] capitalize text-foreground">{u.plan_id}</span>
                    <span className="text-[12px] tabular-nums text-foreground">{u.credits_remaining.toLocaleString()}</span>
                    <span className="text-[11px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[11px]"
                      onClick={() => setGrantTarget(
                        grantTarget?.id === u.id ? null : { id: u.id, name: u.full_name ?? u.email }
                      )}
                    >
                      <Zap className="size-3.5 text-accent" strokeWidth={1.75} />
                      Grant
                    </Button>
                  </div>
                  {grantTarget?.id === u.id && (
                    <div className="border-b border-border/50 px-4 py-3 bg-muted/20">
                      <GrantCreditsForm userId={u.id} userName={grantTarget.name} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Credits tab — same as users but focused on credit info */}
      {activeTab === "credits" && (
        <div className="rounded-[var(--radius-xl)] bg-surface ring-1 ring-border p-5">
          <p className="text-[13px] text-muted-foreground">
            Use the Users tab to grant or revoke credits for individual users. All credit actions are immutably logged.
          </p>
        </div>
      )}

      {/* Tickets tab */}
      {activeTab === "tickets" && (
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Ticket className="mb-2 size-8 text-muted-foreground/30" strokeWidth={1.25} />
              <p className="text-[13px] text-muted-foreground">No support tickets</p>
            </div>
          ) : (
            (tickets as Array<{
              id: string;
              subject: string;
              status: string;
              category: string;
              priority: string;
              created_at: string;
              profiles?: { full_name?: string; email?: string; avatar_url?: string };
            }>).map((t) => (
              <div key={t.id} className="rounded-[var(--radius-lg)] bg-surface px-4 py-3 ring-1 ring-border">
                <div className="flex items-start gap-3">
                  {t.profiles && (
                    <Avatar
                      name={t.profiles.full_name ?? t.profiles.email ?? "User"}
                      src={t.profiles.avatar_url}
                      size="sm"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-foreground">{t.subject}</p>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        t.status === "open" ? "bg-accent/10 text-accent" : "bg-positive/10 text-positive",
                      )}>
                        {t.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{t.priority}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {t.profiles?.email ?? "Unknown"} · {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Auth Health */}
      {activeTab === "auth" && (
        <div className="max-w-2xl">
          <AuthHealthPanel />
        </div>
      )}

      {/* Audit log */}
      {activeTab === "audit" && (
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : auditLogs.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Shield className="mb-2 size-8 text-muted-foreground/30" strokeWidth={1.25} />
              <p className="text-[13px] text-muted-foreground">No audit events yet</p>
            </div>
          ) : (
            (auditLogs as Array<{ id: string; action: string; created_at: string; actor_id?: string; target_id?: string; details: Record<string, unknown> }>).map((log) => (
              <div key={log.id} className="flex items-start gap-3 rounded-[var(--radius-lg)] bg-surface px-4 py-3 ring-1 ring-border">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                  <Shield className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-foreground">{log.action}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground font-mono">
                    {JSON.stringify(log.details).slice(0, 80)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground/60">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

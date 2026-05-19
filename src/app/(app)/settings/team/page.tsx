"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard, selectCls } from "@/components/settings/shared";
import { cn } from "@/lib/utils";
import {
  UserPlus,
  Crown,
  ShieldCheck,
  User,
  Mail,
  Clock,
  Users,
  Loader2,
} from "lucide-react";
import { toast } from "@/lib/toast";
import Image from "next/image";

type ApiMember = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  is_you: boolean;
};

type ApiInvite = {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

const roleInfo: Record<
  string,
  {
    icon: React.ElementType;
    label: string;
    description: string;
    badge: "neutral" | "accent" | "positive" | "warning";
  }
> = {
  owner: {
    icon: Crown,
    label: "Owner",
    description: "Full control — billing, deletion, all settings.",
    badge: "warning",
  },
  admin: {
    icon: ShieldCheck,
    label: "Admin",
    description: "Manage members, projects, and integrations.",
    badge: "accent",
  },
  editor: {
    icon: User,
    label: "Editor",
    description: "Create and edit projects, view billing.",
    badge: "neutral",
  },
  viewer: {
    icon: User,
    label: "Viewer",
    description: "View projects and shared resources.",
    badge: "neutral",
  },
  member: {
    icon: User,
    label: "Member",
    description: "Create and edit projects, view billing.",
    badge: "neutral",
  },
};

function displayRoleLabel(role: string): string {
  const k = role.toLowerCase();
  return roleInfo[k]?.label ?? role.charAt(0).toUpperCase() + role.slice(1);
}

function memberInitials(m: ApiMember): string {
  const fromName = (m.display_name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  if (fromName) return fromName.toUpperCase();
  const e = m.email ?? "?";
  return e.slice(0, 2).toUpperCase();
}

export default function TeamSettingsPage() {
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("member");
  const [members, setMembers] = React.useState<ApiMember[]>([]);
  const [invites, setInvites] = React.useState<ApiInvite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);

  async function loadTeam() {
    setLoading(true);
    try {
      const res = await fetch("/api/team", { credentials: "include" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not load team");
      }
      const data = (await res.json()) as { members: ApiMember[]; invites: ApiInvite[] };
      setMembers(data.members ?? []);
      setInvites(data.invites ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load team");
      setMembers([]);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void loadTeam();
  }, []);

  const othersCount = members.filter((m) => !m.is_you).length;
  const totalLabel =
    members.length === 0
      ? "Loading workspace members…"
      : `${members.length} member${members.length !== 1 ? "s" : ""} in this workspace${
          othersCount === 0 ? "" : ` · ${othersCount} teammate${othersCount !== 1 ? "s" : ""}`
        }`;

  async function handleInvite() {
    if (!inviteEmail.includes("@")) return;
    setSending(true);
    const addr = inviteEmail.trim();
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addr,
          role: inviteRole === "admin" ? "admin" : "member",
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; invite?: ApiInvite };
      if (!res.ok) {
        throw new Error(j.error ?? "Invite failed");
      }
      setInviteEmail("");
      if (j.invite) setInvites((prev) => [j.invite as ApiInvite, ...prev]);
      toast.success(`Invitation recorded for ${addr}`);
      await loadTeam();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Invite Team Member" description="Invite collaborators to your workspace by email.">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleInvite()}
            />
          </div>
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className={cn(selectCls, "sm:w-36")}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <Button
            variant="accent"
            size="md"
            onClick={() => void handleInvite()}
            disabled={!inviteEmail.includes("@") || sending}
            className="gap-1.5"
          >
            {sending ? <Loader2 className="size-3.5 animate-spin" strokeWidth={1.6} /> : <UserPlus className="size-3.5" strokeWidth={1.6} />}
            Send invite
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Team Members" description={totalLabel} noPadding>
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-10 text-[13px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" strokeWidth={1.6} />
            Loading members…
          </div>
        ) : (
          <div className="divide-y divide-border">
            {members.map((m) => {
              const meta = roleInfo[m.role.toLowerCase()] ?? roleInfo.member;
              const Icon = meta.icon;
              const label = displayRoleLabel(m.role);
              return (
                <div key={m.user_id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-400 to-purple-600 text-[13px] font-bold text-white shadow-[var(--shadow-xs)] ring-1 ring-border">
                    {m.avatar_url ? (
                      <Image src={m.avatar_url} alt="" width={40} height={40} className="size-full object-cover" unoptimized />
                    ) : (
                      memberInitials(m) || "?"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {m.display_name || m.email?.split("@")[0] || "Member"}
                      {m.is_you ? (
                        <span className="ml-2 text-[11px] font-normal text-muted-foreground">(you)</span>
                      ) : null}
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">{m.email ?? m.user_id}</p>
                  </div>
                  <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                    {m.role.toLowerCase() === "owner" ? <Crown className="size-3.5 text-muted-foreground" strokeWidth={1.6} /> : null}
                    <Icon className="size-3.5 text-muted-foreground" strokeWidth={1.6} />
                    <Badge variant={meta.badge}>{label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && othersCount === 0 && (
          <div className="border-t border-border px-6 py-6 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl bg-muted/60 ring-1 ring-border">
              <Users className="size-4 text-muted-foreground/60" strokeWidth={1.4} />
            </div>
            <p className="text-[13px] font-medium text-foreground">You&apos;re the only one here so far</p>
            <p className="mt-1 text-[12px] text-muted-foreground">Invite collaborators above when you&apos;re ready.</p>
          </div>
        )}
      </SectionCard>

      {invites.length > 0 && (
        <SectionCard title="Pending Invites" description="These invites are waiting to be accepted." noPadding>
          <div className="divide-y divide-border">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center gap-4 px-6 py-4 transition-colors duration-100 hover:bg-muted/30"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-border">
                  <Mail className="size-4 text-muted-foreground" strokeWidth={1.6} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">{invite.email}</p>
                  <div className="mt-0.5 flex items-center gap-1">
                    <Clock className="size-3 text-muted-foreground" strokeWidth={1.6} />
                    <span className="text-[12px] text-muted-foreground">
                      Sent {new Date(invite.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <Badge variant="neutral" className="shrink-0 capitalize">
                  {displayRoleLabel(invite.role)}
                </Badge>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Role Permissions" description="Understand what each role can do." noPadding>
        <div className="divide-y divide-border">
          {(["owner", "admin", "editor"] as const).map((key) => {
            const role = roleInfo[key];
            if (!role) return null;
            const Icon = role.icon;
            return (
              <div key={key} className="flex items-start gap-4 px-6 py-4">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted ring-1 ring-border">
                  <Icon className="size-4 text-muted-foreground" strokeWidth={1.6} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-foreground">{role.label}</p>
                    <Badge variant={role.badge}>{role.label}</Badge>
                  </div>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{role.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

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
  Trash2,
  Mail,
  Clock,
} from "lucide-react";

const initialMembers = [
  {
    id: "u1",
    name: "Alex Chen",
    email: "alex@dreamos86.ai",
    role: "owner" as const,
    avatar: "AC",
    color: "from-blue-400 to-indigo-600",
    joined: "Jan 12, 2026",
  },
  {
    id: "u2",
    name: "Sarah Kim",
    email: "sarah@company.io",
    role: "admin" as const,
    avatar: "SK",
    color: "from-violet-400 to-purple-600",
    joined: "Feb 3, 2026",
  },
  {
    id: "u3",
    name: "Marcus Rodriguez",
    email: "marcus@design.co",
    role: "member" as const,
    avatar: "MR",
    color: "from-emerald-400 to-teal-600",
    joined: "Mar 18, 2026",
  },
];

const pendingInvites = [
  {
    id: "pi1",
    email: "taylor@startup.ai",
    role: "member",
    sentAt: "2 days ago",
  },
  {
    id: "pi2",
    email: "jordan@agency.design",
    role: "admin",
    sentAt: "5 days ago",
  },
];

type RoleKey = "owner" | "admin" | "member";

const roleInfo: Record<
  RoleKey,
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
  member: {
    icon: User,
    label: "Member",
    description: "Create and edit projects, view billing.",
    badge: "neutral",
  },
};

export default function TeamSettingsPage() {
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("member");
  const [members, setMembers] = React.useState(initialMembers);
  const [invites, setInvites] = React.useState(pendingInvites);
  const [inviteSent, setInviteSent] = React.useState(false);

  const handleInvite = () => {
    if (!inviteEmail.includes("@")) return;
    setInvites((prev) => [
      ...prev,
      {
        id: `pi${Date.now()}`,
        email: inviteEmail,
        role: inviteRole,
        sentAt: "Just now",
      },
    ]);
    setInviteEmail("");
    setInviteSent(true);
    setTimeout(() => setInviteSent(false), 3000);
  };

  return (
    <div className="space-y-5">
      {/* Invite */}
      <SectionCard
        title="Invite Team Member"
        description="Invite collaborators to your workspace by email."
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
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
            onClick={handleInvite}
            disabled={!inviteEmail.includes("@")}
            className="gap-1.5"
          >
            <UserPlus className="size-3.5" strokeWidth={1.6} />
            {inviteSent ? "Sent!" : "Send invite"}
          </Button>
        </div>
        {inviteSent && (
          <p className="mt-3 text-[13px] text-positive flex items-center gap-1.5">
            <span className="inline-flex size-4 rounded-full bg-positive/20 items-center justify-center text-[10px]">
              ✓
            </span>
            Invitation sent successfully.
          </p>
        )}
      </SectionCard>

      {/* Members */}
      <SectionCard
        title="Team Members"
        description={`${members.length} member${members.length !== 1 ? "s" : ""} in this workspace.`}
        noPadding
      >
        <div className="divide-y divide-border">
          {members.map((member) => {
            const role = roleInfo[member.role];
            const RoleIcon = role.icon;
            return (
              <div
                key={member.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors duration-100"
              >
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[13px] font-bold text-white shadow-[var(--shadow-xs)]",
                    member.color,
                  )}
                >
                  {member.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">
                    {member.name}
                  </p>
                  <p className="text-[12px] text-muted-foreground truncate">
                    {member.email}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  <RoleIcon
                    className="size-3.5 text-muted-foreground"
                    strokeWidth={1.6}
                  />
                  <Badge variant={role.badge}>{role.label}</Badge>
                </div>
                <p className="hidden md:block text-[12px] text-muted-foreground shrink-0">
                  Joined {member.joined}
                </p>
                {member.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setMembers((prev) =>
                        prev.filter((m) => m.id !== member.id),
                      )
                    }
                    className="text-muted-foreground hover:text-red-500 shrink-0"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.6} />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Pending invites */}
      {invites.length > 0 && (
        <SectionCard
          title="Pending Invites"
          description="These people have been invited but haven't joined yet."
          noPadding
        >
          <div className="divide-y divide-border">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors duration-100"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-border">
                  <Mail
                    className="size-4 text-muted-foreground"
                    strokeWidth={1.6}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">
                    {invite.email}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock
                      className="size-3 text-muted-foreground"
                      strokeWidth={1.6}
                    />
                    <span className="text-[12px] text-muted-foreground">
                      Invited {invite.sentAt}
                    </span>
                  </div>
                </div>
                <Badge variant="neutral" className="shrink-0 capitalize">
                  {invite.role}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setInvites((prev) =>
                      prev.filter((i) => i.id !== invite.id),
                    )
                  }
                  className="text-muted-foreground hover:text-red-500 shrink-0"
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Role descriptions */}
      <SectionCard
        title="Role Permissions"
        description="Understand what each role can do."
        noPadding
      >
        <div className="divide-y divide-border">
          {(Object.entries(roleInfo) as [RoleKey, (typeof roleInfo)[RoleKey]][]).map(
            ([key, role]) => {
              const Icon = role.icon;
              return (
                <div key={key} className="flex items-start gap-4 px-6 py-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted ring-1 ring-border mt-0.5">
                    <Icon
                      className="size-4 text-muted-foreground"
                      strokeWidth={1.6}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium text-foreground">
                        {role.label}
                      </p>
                      <Badge variant={role.badge}>{role.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {role.description}
                    </p>
                  </div>
                </div>
              );
            },
          )}
        </div>
      </SectionCard>
    </div>
  );
}

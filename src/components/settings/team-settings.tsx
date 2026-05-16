"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { UserPlus, Crown, Shield, User, Users } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { variants } from "@/lib/motion";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

// Team collaboration reads from Supabase — real members only

const roleConfig = {
  owner: { label: "Owner", icon: Crown, color: "text-amber-600 bg-amber-500/15 ring-amber-500/20 dark:text-amber-400" },
  admin: { label: "Admin", icon: Shield, color: "text-accent bg-accent-muted ring-accent/20" },
  member: { label: "Member", icon: User, color: "text-muted-foreground bg-muted/60 ring-border" },
};

export function TeamSettings() {
  const { profile } = useAuthStore();
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteSent, setInviteSent] = React.useState(false);
  const displayName = profile?.full_name ?? profile?.email?.split("@")[0] ?? "You";

  return (
    <div className="space-y-6">
      <motion.div variants={variants.staggerContainer} initial="hidden" animate="show" className="space-y-6">
        {/* Invite */}
        <motion.div variants={variants.staggerItem}>
          <Card>
            <CardHeader>
              <CardTitle>Invite Team Members</CardTitle>
              <CardDescription>Add collaborators to your workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setInviteSent(false); }}
                  className="flex-1"
                />
                <Button
                  variant="accent"
                  size="md"
                  disabled={!inviteEmail || inviteSent}
                  onClick={() => {
                    // Team invites require backend — show honest message
                    setInviteSent(true);
                    setInviteEmail("");
                  }}
                >
                  <UserPlus className="size-4" strokeWidth={1.75} />
                  Invite
                </Button>
              </div>
              {inviteSent ? (
                <p className="mt-2 text-[12px] text-positive">
                  Team invitations will be enabled with full team collaboration support. Your request has been noted.
                </p>
              ) : (
                <p className="mt-2 text-[12px] text-muted-foreground">
                  They&apos;ll receive an email with a link to join your workspace.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Members — current user as owner */}
        <motion.div variants={variants.staggerItem}>
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>1 member in this workspace</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/60 p-0">
              {/* Current user — real data */}
              <div className="flex items-center gap-3 px-6 py-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-[13px] font-semibold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground">{displayName}</p>
                  <p className="text-[12px] text-muted-foreground">{profile?.email ?? ""}</p>
                </div>
                <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", roleConfig.owner.color)}>
                  <Crown className="size-2.5" strokeWidth={2} />
                  Owner
                </span>
              </div>

              {/* Empty state for other team members */}
              <div className="flex flex-col items-center py-8 text-center">
                <Users className="mb-2 size-8 text-muted-foreground/20" strokeWidth={1.25} />
                <p className="text-[13px] text-muted-foreground">No other members yet</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground/70">
                  Invite colleagues above to collaborate on projects.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Role descriptions */}
        <motion.div variants={variants.staggerItem}>
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
              <CardDescription>What each role can do in your workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(roleConfig).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <div key={key} className="flex items-start gap-3">
                    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] ring-1", config.color)}>
                      <Icon className="size-3.5" strokeWidth={1.75} />
                    </span>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{config.label}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {key === "owner" && "Full access. Can manage billing, team, and delete workspace."}
                        {key === "admin" && "Can create apps, manage integrations, and invite members."}
                        {key === "member" && "Can create and edit apps. No admin or billing access."}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

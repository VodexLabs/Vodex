"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SectionCard,
  SettingRow,
  FieldLabel,
  SectionFooter,
} from "@/components/settings/shared";
import { cn } from "@/lib/utils";
import {
  Shield,
  Smartphone,
  Monitor,
  Laptop,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";

const sessions = [
  {
    id: "s1",
    device: 'MacBook Pro 16"',
    browser: "Chrome 124",
    location: "San Francisco, CA",
    lastSeen: "Active now",
    current: true,
    icon: Laptop,
  },
  {
    id: "s2",
    device: "iPhone 15 Pro",
    browser: "Safari Mobile",
    location: "San Francisco, CA",
    lastSeen: "2 hours ago",
    current: false,
    icon: Smartphone,
  },
  {
    id: "s3",
    device: "Windows PC",
    browser: "Edge 124",
    location: "New York, NY",
    lastSeen: "3 days ago",
    current: false,
    icon: Monitor,
  },
];

export default function AccountSettingsPage() {
  const [fullName, setFullName] = React.useState("Alex Chen");
  const [email, setEmail] = React.useState("alex@dreamos86.ai");
  const [username, setUsername] = React.useState("alexchen");
  const [currentPwd, setCurrentPwd] = React.useState("");
  const [newPwd, setNewPwd] = React.useState("");
  const [confirmPwd, setConfirmPwd] = React.useState("");
  const [showPwd, setShowPwd] = React.useState(false);
  const [twoFA, setTwoFA] = React.useState(false);
  const [revokedSessions, setRevokedSessions] = React.useState<Set<string>>(
    new Set(),
  );
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);
  const [deleteInput, setDeleteInput] = React.useState("");

  const pwdMatch = newPwd && confirmPwd && newPwd === confirmPwd;

  return (
    <div className="space-y-5">
      {/* Profile */}
      <SectionCard
        title="Profile"
        description="How you appear across DreamOS86."
      >
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative size-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 ring-2 ring-border flex items-center justify-center text-[22px] font-bold text-white select-none shadow-[var(--shadow-sm)]">
              AC
            </div>
            <div>
              <Button variant="secondary" size="sm">
                Change avatar
              </Button>
              <p className="mt-1.5 text-[12px] text-muted-foreground">
                PNG or JPG, min 200×200px
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <FieldLabel>Full name</FieldLabel>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>
            <label className="block">
              <FieldLabel>Username</FieldLabel>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground select-none">
                  @
                </span>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-7"
                />
              </div>
            </label>
            <label className="block sm:col-span-2">
              <FieldLabel>Email address</FieldLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          </div>
        </div>
        <SectionFooter>
          <Button variant="ghost" size="md">
            Discard
          </Button>
          <Button variant="accent" size="md">
            Save profile
          </Button>
        </SectionFooter>
      </SectionCard>

      {/* Change Password */}
      <SectionCard
        title="Change Password"
        description="Use a strong password you don't use elsewhere."
      >
        <div className="space-y-4 max-w-sm">
          <label className="block">
            <FieldLabel>Current password</FieldLabel>
            <div className="relative">
              <Input
                type={showPwd ? "text" : "password"}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPwd ? (
                  <EyeOff className="size-4" strokeWidth={1.6} />
                ) : (
                  <Eye className="size-4" strokeWidth={1.6} />
                )}
              </button>
            </div>
          </label>
          <label className="block">
            <FieldLabel>New password</FieldLabel>
            <Input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Min. 12 characters"
            />
          </label>
          <label className="block">
            <FieldLabel>Confirm new password</FieldLabel>
            <div className="relative">
              <Input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Repeat new password"
                className={cn(
                  confirmPwd && !pwdMatch && "ring-red-300 dark:ring-red-700",
                )}
              />
              {pwdMatch && (
                <CheckCircle2
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-positive"
                  strokeWidth={1.6}
                />
              )}
            </div>
            {confirmPwd && !pwdMatch && (
              <p className="mt-1 text-[12px] text-red-500">
                Passwords do not match.
              </p>
            )}
          </label>
        </div>
        <SectionFooter>
          <Button
            variant="accent"
            size="md"
            disabled={!currentPwd || !pwdMatch}
          >
            Update password
          </Button>
        </SectionFooter>
      </SectionCard>

      {/* Two-Factor Auth */}
      <SectionCard
        title="Two-Factor Authentication"
        description="Add an extra layer of security to your account."
      >
        <SettingRow
          title="Authenticator app"
          description="Use an app like 1Password, Authy, or Google Authenticator."
          border={false}
        >
          <div className="flex items-center gap-3">
            <Badge variant={twoFA ? "positive" : "neutral"}>
              {twoFA ? "Enabled" : "Disabled"}
            </Badge>
            <Switch
              checked={twoFA}
              onCheckedChange={setTwoFA}
              aria-label="Two-factor authentication"
            />
          </div>
        </SettingRow>
        {twoFA && (
          <div className="mt-4 rounded-[var(--radius-md)] bg-positive-muted ring-1 ring-positive/20 px-4 py-3">
            <div className="flex items-start gap-2">
              <Shield
                className="size-4 shrink-0 mt-0.5 text-positive"
                strokeWidth={1.6}
              />
              <div className="text-[13px] text-positive">
                <p className="font-medium">2FA is active</p>
                <p className="mt-0.5 text-positive/80">
                  Your account is protected. Backup codes were sent to your
                  email.
                </p>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Sessions */}
      <SectionCard
        title="Active Sessions"
        description="Devices currently signed in to your account."
        noPadding
      >
        <div className="divide-y divide-border">
          {sessions.map((session) => {
            const Icon = session.icon;
            const isRevoked = revokedSessions.has(session.id);
            return (
              <div
                key={session.id}
                className={cn(
                  "flex items-center gap-4 px-6 py-4 transition-colors",
                  isRevoked && "opacity-40",
                )}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted ring-1 ring-border">
                  <Icon
                    className="size-4 text-muted-foreground"
                    strokeWidth={1.6}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-foreground">
                      {session.device}
                    </p>
                    {session.current && (
                      <Badge variant="positive">Current</Badge>
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {session.browser} · {session.location} · {session.lastSeen}
                  </p>
                </div>
                {!session.current && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isRevoked}
                    onClick={() =>
                      setRevokedSessions((s) => new Set([...s, session.id]))
                    }
                    className="text-muted-foreground hover:text-red-500"
                  >
                    {isRevoked ? "Revoked" : "Revoke"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Danger Zone */}
      <SectionCard
        title="Danger Zone"
        description="Permanently delete your account and all associated data."
        danger
      >
        {!deleteConfirm ? (
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[13px] font-medium text-foreground">
                Delete account
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                All your data, projects, and subscriptions will be removed.
                This action is permanent.
              </p>
            </div>
            <Button
              variant="outline"
              size="md"
              className="shrink-0 text-red-600 dark:text-red-400 ring-red-200/70 dark:ring-red-800/50 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => setDeleteConfirm(true)}
            >
              <Trash2 className="size-3.5" strokeWidth={1.6} />
              Delete account
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-red-100/60 dark:bg-red-950/30 px-4 py-3 ring-1 ring-red-200/60 dark:ring-red-800/40">
              <AlertTriangle
                className="size-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400"
                strokeWidth={1.6}
              />
              <p className="text-[13px] text-red-700 dark:text-red-300">
                Type <strong>delete my account</strong> below to confirm
                permanent deletion.
              </p>
            </div>
            <Input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder='Type "delete my account" to confirm'
              className="ring-red-200/70 dark:ring-red-800/40 focus:ring-red-400 max-w-sm"
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  setDeleteConfirm(false);
                  setDeleteInput("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="md"
                disabled={deleteInput !== "delete my account"}
                className="text-red-600 dark:text-red-400 ring-red-200/70 dark:ring-red-800/50 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40"
              >
                Permanently delete
              </Button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

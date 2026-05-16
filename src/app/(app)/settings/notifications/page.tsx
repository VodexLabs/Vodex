"use client";

import * as React from "react";
import {
  notifications as initialNotifs,
  type Notification,
} from "@/lib/data";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/settings/shared";
import { cn } from "@/lib/utils";
import {
  Bell,
  Rocket,
  Hammer,
  UserPlus,
  Zap,
  Settings,
  Bot,
  CheckCheck,
  Trash2,
  Mail,
  Smartphone,
} from "lucide-react";

type NotifType = Notification["type"];

interface NotifPref {
  email: boolean;
  inApp: boolean;
}

const notifTypes: {
  key: NotifType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    key: "deploy",
    label: "Deployments",
    description: "Success, failure, and rollback events.",
    icon: Rocket,
  },
  {
    key: "build",
    label: "Build status",
    description: "Build started, completed, or failed.",
    icon: Hammer,
  },
  {
    key: "invite",
    label: "Team invites",
    description: "When someone joins or is invited.",
    icon: UserPlus,
  },
  {
    key: "credit",
    label: "Credits & billing",
    description: "Low credit warnings and payment receipts.",
    icon: Zap,
  },
  {
    key: "system",
    label: "System updates",
    description: "Platform releases and maintenance windows.",
    icon: Settings,
  },
  {
    key: "ai",
    label: "AI generations",
    description: "When a generation completes or needs review.",
    icon: Bot,
  },
];

const notifIcons: Record<NotifType, React.ElementType> = {
  deploy: Rocket,
  build: Hammer,
  invite: UserPlus,
  credit: Zap,
  system: Settings,
  ai: Bot,
};

const notifBadge: Record<
  NotifType,
  "neutral" | "accent" | "positive" | "warning"
> = {
  deploy: "positive",
  build: "warning",
  invite: "accent",
  credit: "warning",
  system: "neutral",
  ai: "accent",
};

export default function NotificationsSettingsPage() {
  const [prefs, setPrefs] = React.useState<Record<NotifType, NotifPref>>(
    Object.fromEntries(
      notifTypes.map(({ key }) => [key, { email: true, inApp: true }]),
    ) as Record<NotifType, NotifPref>,
  );

  const [notifs, setNotifs] = React.useState<Notification[]>(initialNotifs);

  const setEmail = (key: NotifType, v: boolean) =>
    setPrefs((p) => ({ ...p, [key]: { ...p[key], email: v } }));

  const setInApp = (key: NotifType, v: boolean) =>
    setPrefs((p) => ({ ...p, [key]: { ...p[key], inApp: v } }));

  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <div className="space-y-5">
      {/* Preferences */}
      <SectionCard
        title="Notification Preferences"
        description="Choose how you receive notifications for each event type."
      >
        {/* Channel header */}
        <div className="flex items-center justify-end gap-5 mb-2 pb-3 border-b border-border">
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Mail className="size-3.5" strokeWidth={1.6} />
            Email
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Smartphone className="size-3.5" strokeWidth={1.6} />
            In-app
          </div>
        </div>
        <div>
          {notifTypes.map(({ key, label, description, icon: Icon }) => (
            <div
              key={key}
              className="flex items-center gap-4 py-4 border-b border-border last:border-0"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted ring-1 ring-border">
                <Icon
                  className="size-4 text-muted-foreground"
                  strokeWidth={1.6}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground">
                  {label}
                </p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {description}
                </p>
              </div>
              <div className="flex items-center gap-5 shrink-0">
                <Switch
                  checked={prefs[key].email}
                  onCheckedChange={(v) => setEmail(key, v)}
                  aria-label={`${label} email`}
                />
                <Switch
                  checked={prefs[key].inApp}
                  onCheckedChange={(v) => setInApp(key, v)}
                  aria-label={`${label} in-app`}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-border">
          <Button variant="ghost" size="md">
            Discard
          </Button>
          <Button variant="accent" size="md">
            Save preferences
          </Button>
        </div>
      </SectionCard>

      {/* Recent notifications */}
      <SectionCard
        title="Recent Notifications"
        description={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
            : "All caught up!"
        }
        noPadding
      >
        {/* Actions bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border">
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
            <span className="text-[12px] text-muted-foreground">
              {notifs.length} notification{notifs.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
                }
                className="gap-1.5 text-[12px]"
              >
                <CheckCheck className="size-3.5" strokeWidth={1.6} />
                Mark all read
              </Button>
            )}
            {notifs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNotifs([])}
                className="gap-1.5 text-[12px] text-muted-foreground hover:text-red-500"
              >
                <Trash2 className="size-3.5" strokeWidth={1.6} />
                Clear all
              </Button>
            )}
          </div>
        </div>

        {notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="size-12 rounded-full bg-muted ring-1 ring-border flex items-center justify-center mb-4">
              <Bell className="size-5 text-muted-foreground" strokeWidth={1.6} />
            </div>
            <p className="text-[14px] font-medium text-foreground">
              No notifications
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              You&apos;re all caught up. We&apos;ll notify you when something
              happens.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifs.map((n) => {
              const Icon = notifIcons[n.type];
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() =>
                    setNotifs((prev) =>
                      prev.map((x) =>
                        x.id === n.id ? { ...x, read: !x.read } : x,
                      ),
                    )
                  }
                  className={cn(
                    "w-full flex items-start gap-4 px-6 py-4 text-left hover:bg-muted/30 transition-colors duration-100",
                    !n.read && "bg-accent-muted/30",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] ring-1 mt-0.5",
                      !n.read
                        ? "bg-accent-muted ring-accent/20"
                        : "bg-muted ring-border",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4",
                        !n.read ? "text-accent" : "text-muted-foreground",
                      )}
                      strokeWidth={1.6}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={cn(
                          "text-[13px] font-medium truncate",
                          !n.read
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {n.title}
                      </p>
                      <Badge
                        variant={notifBadge[n.type]}
                        className="capitalize text-[10px] shrink-0"
                      >
                        {n.type}
                      </Badge>
                      {!n.read && (
                        <span className="size-1.5 rounded-full bg-accent shrink-0" />
                      )}
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted-foreground line-clamp-2 text-left">
                      {n.body}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      {n.timeLabel}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

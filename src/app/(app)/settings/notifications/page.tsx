"use client";

import * as React from "react";
import {
  notifications as seedNotifs,
  type Notification,
} from "@/lib/data";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/settings/shared";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
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
  Monitor,
} from "lucide-react";

type NotifType = Notification["type"];

const PREFS_STORAGE_KEY = "dreamos-notification-prefs-v1";

interface NotifPref {
  inWeb: boolean;
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

function defaultPrefs(): Record<NotifType, NotifPref> {
  return Object.fromEntries(
    notifTypes.map(({ key }) => [key, { inWeb: true }]),
  ) as Record<NotifType, NotifPref>;
}

function loadPrefs(): Record<NotifType, NotifPref> {
  const base = defaultPrefs();
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Record<string, { inWeb?: boolean }>;
    for (const { key } of notifTypes) {
      const row = parsed[key];
      if (row && typeof row.inWeb === "boolean") {
        base[key] = { inWeb: row.inWeb };
      }
    }
    return base;
  } catch {
    return defaultPrefs();
  }
}

function savePrefs(p: Record<NotifType, NotifPref>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(p));
}

export default function NotificationsSettingsPage() {
  const [prefs, setPrefs] = React.useState<Record<NotifType, NotifPref>>(defaultPrefs);
  const [savedSnapshot, setSavedSnapshot] = React.useState<Record<NotifType, NotifPref> | null>(
    null,
  );

  React.useEffect(() => {
    const loaded = loadPrefs();
    setPrefs(loaded);
    setSavedSnapshot(loaded);
  }, []);

  const [notifs, setNotifs] = React.useState<Notification[]>(seedNotifs);

  const setInWeb = (key: NotifType, v: boolean) =>
    setPrefs((p) => ({ ...p, [key]: { inWeb: v } }));

  const isDirty =
    savedSnapshot &&
    notifTypes.some(({ key }) => prefs[key].inWeb !== savedSnapshot[key].inWeb);

  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <div className="space-y-5">
      <SectionCard
        title="Notification Preferences"
        description="In-web alerts appear in DreamOS86 while you are signed in. Email delivery is not available yet — preferences are stored in your browser on this device."
      >
        <div className="flex items-center justify-end gap-2 mb-2 pb-3 border-b border-border">
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Monitor className="size-3.5" strokeWidth={1.6} />
            In-web
          </div>
        </div>
        <div>
          {notifTypes.map(({ key, label, description, icon: Icon }) => (
            <div
              key={key}
              className="flex items-center gap-4 py-4 border-b border-border last:border-0"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted ring-1 ring-border">
                <Icon className="size-4 text-muted-foreground" strokeWidth={1.6} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground">{label}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
              </div>
              <div className="flex items-center shrink-0">
                <Switch
                  checked={prefs[key].inWeb}
                  onCheckedChange={(v) => setInWeb(key, v)}
                  aria-label={`${label} in-web`}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-border">
          <Button
            variant="ghost"
            size="md"
            disabled={!isDirty}
            onClick={() => {
              const snap = savedSnapshot ?? loadPrefs();
              setPrefs(snap);
            }}
          >
            Discard
          </Button>
          <Button
            variant="accent"
            size="md"
            disabled={!isDirty}
            onClick={() => {
              savePrefs(prefs);
              setSavedSnapshot(prefs);
              toast.success("Notification preferences saved on this device");
            }}
          >
            Save preferences
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Recent Notifications"
        description={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
            : "All caught up!"
        }
        noPadding
      >
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
            <p className="text-[14px] font-medium text-foreground">No notifications</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              You&apos;re all caught up. We&apos;ll notify you when something happens.
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
                          !n.read ? "text-foreground" : "text-muted-foreground",
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
                    <p className="mt-1 text-[11px] text-muted-foreground/70">{n.timeLabel}</p>
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

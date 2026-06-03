"use client";

import * as React from "react";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Users,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/settings/shared";
import { toast } from "@/lib/toast";
import { setCachedNotificationPrefs } from "@/lib/notifications/notification-prefs-cache";
import {
  defaultNotificationPrefs,
  normalizeNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notifications/notification-preferences";
import {
  IN_WEB_SOUND_KEYS,
  IN_WEB_SOUND_LABELS,
  type InWebSoundKey,
} from "@/lib/notifications/in-web-sound-keys";

const SOUND_ICONS: Record<InWebSoundKey, React.ElementType> = {
  inbox_message: Bell,
  build_completed: CheckCircle2,
  build_failed: AlertTriangle,
  prompt_finished: Sparkles,
  credits_warning: Zap,
  workspace_event: Users,
};

export default function NotificationsSettingsPage() {
  const [prefs, setPrefs] = React.useState<NotificationPrefs>(() => defaultNotificationPrefs());
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void fetch("/api/notification-preferences", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { prefs?: unknown } | null) => {
        if (json?.prefs) setPrefs(normalizeNotificationPrefs(json.prefs));
      })
      .catch(() => undefined);
  }, []);

  function setSound(key: InWebSoundKey, on: boolean) {
    setPrefs((p) => ({
      ...p,
      inWebSounds: { ...p.inWebSounds, [key]: on },
      soundEnabled: key === "inbox_message" ? on : p.soundEnabled,
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const normalized = normalizeNotificationPrefs(prefs);
      normalized.soundEnabled = normalized.inWebSounds.inbox_message;
      setCachedNotificationPrefs(normalized);
      const res = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prefs: normalized }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("In-web sound preferences saved");
    } catch {
      toast.error("Could not save preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5" data-testid="notifications-sound-settings">
      <SectionCard
        title="In-web sounds"
        description="Choose which Vodex events play a sound while the app is open. Notifications always appear in your inbox — sounds are optional."
      >
        <div className="divide-y divide-border">
          {IN_WEB_SOUND_KEYS.map((key) => {
            const Icon = SOUND_ICONS[key];
            const meta = IN_WEB_SOUND_LABELS[key];
            return (
              <div key={key} className="flex items-center justify-between gap-4 py-3.5" data-sound-key={key}>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/15">
                    <Icon className="size-4 text-accent" strokeWidth={1.65} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{meta.title}</p>
                    <p className="text-[12px] text-muted-foreground">{meta.description}</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.inWebSounds[key]}
                  onCheckedChange={(v) => setSound(key, v)}
                  aria-label={meta.title}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 border-t border-border pt-4 text-[11px] text-muted-foreground">
          <Volume2 className="size-3.5" strokeWidth={1.6} />
          Sounds play only while Vodex is open in this browser.
        </div>
        <div className="mt-4 flex justify-center border-t border-border pt-4">
          <Button variant="accent" size="md" disabled={saving} onClick={() => void save()}>
            Save preferences
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}

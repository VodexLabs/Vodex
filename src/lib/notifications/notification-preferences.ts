import type { InWebSoundKey } from "@/lib/notifications/in-web-sound-keys";
import { defaultInWebSounds, IN_WEB_SOUND_KEYS } from "@/lib/notifications/in-web-sound-keys";

export type NotificationCategory =
  | "deploy"
  | "build"
  | "invite"
  | "credit"
  | "system"
  | "ai";

export type NotificationPrefs = {
  /** @deprecated use inWebSounds — kept for DB backward compat */
  categories: Record<NotificationCategory, { inApp: boolean; sound: boolean }>;
  /** @deprecated use inWebSounds.inbox_message */
  soundEnabled: boolean;
  inWebSounds: Record<InWebSoundKey, boolean>;
};

const DEFAULT: NotificationPrefs = {
  soundEnabled: true,
  inWebSounds: defaultInWebSounds(),
  categories: {
    deploy: { inApp: true, sound: true },
    build: { inApp: true, sound: true },
    invite: { inApp: true, sound: true },
    credit: { inApp: true, sound: true },
    system: { inApp: true, sound: true },
    ai: { inApp: true, sound: true },
  },
};

export function defaultNotificationPrefs(): NotificationPrefs {
  return structuredClone(DEFAULT);
}

export function normalizeNotificationPrefs(raw: unknown): NotificationPrefs {
  const base = defaultNotificationPrefs();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;

  if (typeof o.soundEnabled === "boolean") {
    base.soundEnabled = o.soundEnabled;
    if (!o.inWebSounds) {
      for (const key of IN_WEB_SOUND_KEYS) {
        base.inWebSounds[key] = o.soundEnabled;
      }
    }
  }

  const sounds = o.inWebSounds ?? o.sounds;
  if (sounds && typeof sounds === "object") {
    for (const key of IN_WEB_SOUND_KEYS) {
      const v = (sounds as Record<string, unknown>)[key];
      if (typeof v === "boolean") base.inWebSounds[key] = v;
    }
  }

  base.soundEnabled = base.inWebSounds.inbox_message;

  const cats = o.categories;
  if (cats && typeof cats === "object") {
    for (const key of Object.keys(base.categories) as NotificationCategory[]) {
      const row = (cats as Record<string, unknown>)[key];
      if (row && typeof row === "object") {
        const r = row as Record<string, unknown>;
        if (typeof r.inApp === "boolean") base.categories[key].inApp = r.inApp;
        if (typeof r.sound === "boolean") base.categories[key].sound = r.sound;
      }
    }
  }
  return base;
}

export function shouldDeliverInApp(
  prefs: NotificationPrefs,
  type: string,
): boolean {
  const cat = type as NotificationCategory;
  if (cat in prefs.categories) return prefs.categories[cat].inApp;
  return true;
}

export function shouldPlaySound(
  prefs: NotificationPrefs,
  type: string,
): boolean {
  if (!prefs.soundEnabled && !prefs.inWebSounds.inbox_message) return false;
  const cat = type as NotificationCategory;
  if (cat in prefs.categories) return prefs.categories[cat].sound;
  return prefs.inWebSounds.inbox_message;
}

export function shouldPlayInWebSound(
  prefs: NotificationPrefs,
  key: InWebSoundKey,
): boolean {
  return Boolean(prefs.inWebSounds[key]);
}

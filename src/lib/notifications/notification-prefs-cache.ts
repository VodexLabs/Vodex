import {
  defaultNotificationPrefs,
  normalizeNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notifications/notification-preferences";

let cached: NotificationPrefs = defaultNotificationPrefs();

export function getCachedNotificationPrefs(): NotificationPrefs {
  return cached;
}

export function setCachedNotificationPrefs(prefs: NotificationPrefs): void {
  cached = prefs;
}

export async function refreshNotificationPrefsFromApi(): Promise<NotificationPrefs> {
  if (typeof fetch === "undefined") return cached;
  try {
    const res = await fetch("/api/notification-preferences", {
      credentials: "include",
    });
    if (!res.ok) return cached;
    const data = (await res.json()) as { prefs?: unknown };
    cached = normalizeNotificationPrefs(data.prefs);
    return cached;
  } catch {
    return cached;
  }
}

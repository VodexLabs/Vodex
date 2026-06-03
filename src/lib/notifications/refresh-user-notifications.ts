import type { Notification } from "@/lib/supabase/types";
import { useNotificationsStore } from "@/lib/stores/notifications-store";

/** Pull latest notifications from API (fallback when Realtime insert is missed). */
export async function refreshUserNotificationsFromApi(): Promise<void> {
  try {
    const res = await fetch("/api/notifications", { credentials: "include", cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { notifications?: Notification[] };
    if (json.notifications) {
      useNotificationsStore.getState().setNotifications(json.notifications);
    }
  } catch {
    /* ignore */
  }
}

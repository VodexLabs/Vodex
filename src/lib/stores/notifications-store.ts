/**
 * Vodex — Notifications Store
 * Real-time notification state via Supabase Realtime.
 */
import { create } from "zustand";
import type { Notification } from "@/lib/supabase/types";

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;

  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useNotificationsStore = create<NotificationsState>()((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),

  addNotification: (notification) =>
    set((s) => {
      if (s.notifications.some((n) => n.id === notification.id)) return s;
      const next = [notification, ...s.notifications];
      return {
        notifications: next,
        unreadCount: next.filter((n) => !n.read).length,
      };
    }),

  markRead: (id) => {
    set((s) => {
      const updated = s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
    void fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    }).catch(() => undefined);
  },

  markAllRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
    void fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ all: true }),
    }).catch(() => undefined);
  },

  setLoading: (loading) => set({ loading }),

  reset: () => set({ notifications: [], unreadCount: 0, loading: false }),
}));

/**
 * DreamOS86 — Credits Store
 * Single source of truth for credit balance across the entire app.
 * Topbar, credits page, and AI actions all read from here.
 */
import { create } from "zustand";

interface CreditsState {
  remaining: number;
  resetAt: string | null;
  totalUsedThisPeriod: number;
  loading: boolean;
  lastSyncedAt: number | null;

  setCredits: (remaining: number, resetAt?: string | null) => void;
  setUsed: (used: number) => void;
  deductOptimistic: (amount: number) => void;
  setLoading: (loading: boolean) => void;
  syncFromDB: (userId: string) => Promise<void>;
  reset: () => void;
}

export const useCreditsStore = create<CreditsState>()((set, get) => ({
  remaining: 0,
  resetAt: null,
  totalUsedThisPeriod: 0,
  loading: false,
  lastSyncedAt: null,

  setCredits: (remaining, resetAt) =>
    set({ remaining, resetAt: resetAt ?? get().resetAt, lastSyncedAt: Date.now() }),

  setUsed: (totalUsedThisPeriod) => set({ totalUsedThisPeriod }),

  deductOptimistic: (amount) =>
    set((s) => ({
      remaining: Math.max(0, s.remaining - amount),
      totalUsedThisPeriod: s.totalUsedThisPeriod + amount,
    })),

  setLoading: (loading) => set({ loading }),

  syncFromDB: async (userId: string) => {
    // Avoid hammering the DB — skip if synced within last 30s
    const { lastSyncedAt, loading } = get();
    if (loading || (lastSyncedAt && Date.now() - lastSyncedAt < 30_000)) return;

    set({ loading: true });
    try {
      const res = await fetch("/api/credits");
      if (!res.ok) throw new Error("Failed to fetch credits");
      const data = await res.json();
      set({
        remaining: data.remaining ?? 0,
        resetAt: data.reset_at ?? null,
        totalUsedThisPeriod: data.total_used ?? 0,
        loading: false,
        lastSyncedAt: Date.now(),
      });
    } catch {
      set({ loading: false });
    }
  },

  reset: () =>
    set({
      remaining: 0,
      resetAt: null,
      totalUsedThisPeriod: 0,
      loading: false,
      lastSyncedAt: null,
    }),
}));

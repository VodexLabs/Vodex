"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, X, Loader2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useCreditsStore } from "@/lib/stores/credits-store";

interface LogoutConfirmModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Logout confirmation modal.
 *
 * Uses createPortal so it always renders at the document body level,
 * guaranteeing correct stacking regardless of parent overflow/z-index.
 * Backdrop is fully opaque (dark scrim) — no transparency artifacts.
 */
export function LogoutConfirmModal({ open, onClose }: LogoutConfirmModalProps) {
  const { reset: resetAuth } = useAuthStore();
  const creditsStore = useCreditsStore();
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  async function confirmLogout() {
    setLoading(true);
    setErrorMsg(null);

    // Fire signOut but race it with a 4s timeout — if Supabase hangs we still
    // proceed with local cleanup so the user is never stuck in "Signing out…".
    try {
      const supabase = createClient();
      await Promise.race([
        supabase.auth.signOut(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 4000),
        ),
      ]);
    } catch {
      // Best-effort — always proceed regardless of server-side result
    }

    // Clear ALL local auth data
    try {
      const keys = Object.keys(localStorage).filter(
        (k) => k.startsWith("sb-") || k.startsWith("dreamos-") || k === "supabase.auth.token",
      );
      keys.forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch { /* ignore in SSR */ }

    resetAuth();
    creditsStore.reset();

    // Hard navigate — clears all React state and ensures no stale auth
    window.location.replace("/auth/login");
  }

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose, loading]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        // Full-viewport flex layer — guarantees pixel-perfect centering on every screen.
        // Using a single wrapper div avoids the translate(-50%,-50%) + Framer y-animation
        // conflict that caused sub-pixel jitter and clipping.
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            background: "rgba(15,23,60,0.45)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
          onClick={loading ? undefined : onClose}
        >
          {/* Modal — stopPropagation so clicks inside don't close */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: "100%", maxWidth: "22rem", zIndex: 99999 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overflow-hidden rounded-2xl bg-background ring-1 ring-accent/20 shadow-[0_0_0_1px_hsl(var(--accent)/0.12),0_8px_32px_-4px_hsl(var(--accent)/0.18),0_24px_64px_-8px_hsl(var(--accent)/0.10)]">
              {/* Blue-accent top bar */}
              <div className="h-1 w-full bg-gradient-to-r from-accent via-violet-500 to-accent" />

              {/* Header */}
              <div className="flex items-start justify-between gap-3 px-6 pt-5">
                <div className="flex items-center gap-3.5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
                    <LogOut className="size-5 text-accent" strokeWidth={1.65} />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-foreground">Log out of DreamOS86?</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">
                      You&apos;ll be redirected to the sign-in page.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-surface hover:text-foreground"
                >
                  <X className="size-3.5" strokeWidth={1.75} />
                </button>
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="mx-6 mt-3 flex items-start gap-2 rounded-lg bg-destructive/8 px-3 py-2 text-[12px] text-destructive ring-1 ring-destructive/15">
                  <AlertTriangle className="size-3.5 shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div>
                    <p className="font-medium">Logout issue</p>
                    <p className="mt-0.5 opacity-80">{errorMsg}</p>
                    <p className="mt-1 opacity-60">Your local session will still be cleared.</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2.5 px-6 py-5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-surface py-2.5 text-[13px] font-medium text-foreground ring-1 ring-border transition hover:bg-surface-raised disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmLogout}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent to-violet-500 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_16px_-2px_hsl(var(--accent)/0.40)] transition hover:opacity-90 active:scale-[0.98] disabled:opacity-70 disabled:shadow-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
                      Signing out…
                    </>
                  ) : (
                    <>
                      <LogOut className="size-3.5" strokeWidth={2} />
                      Log out
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

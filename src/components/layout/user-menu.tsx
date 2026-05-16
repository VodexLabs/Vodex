"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Settings, CreditCard, Bell, HelpCircle,
  LogOut, Moon, Sun, Gift, ChevronRight, Loader2, Zap,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useCreditsStore } from "@/lib/stores/credits-store";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ─── Menu item types ──────────────────────────────────────────────────────────

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href?: string;
  onClick?: () => void;
  badge?: string;
  danger?: boolean;
  separator?: boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MenuRow({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const Icon = item.icon;

  const inner = (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition",
        item.danger
          ? "text-red-500 hover:bg-red-500/8 hover:text-red-500"
          : "text-foreground hover:bg-surface",
      )}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.65} />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
          {item.badge}
        </span>
      )}
      {item.href && !item.badge && (
        <ChevronRight className="size-3.5 text-muted-foreground/50" strokeWidth={1.75} />
      )}
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} onClick={onClose} className="block cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => { item.onClick?.(); onClose(); }}
      className="w-full cursor-pointer rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {inner}
    </button>
  );
}

function DarkModeToggle({ onClose }: { onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-foreground transition hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {isDark
        ? <Sun className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.65} />
        : <Moon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.65} />
      }
      <span className="flex-1">{isDark ? "Light mode" : "Dark mode"}</span>
      <div className={cn(
        "flex h-5 w-8 items-center rounded-full px-0.5 transition-colors",
        isDark ? "bg-foreground justify-end" : "bg-muted justify-start",
      )}>
        <div className="size-4 rounded-full bg-background shadow-sm" />
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function UserMenu() {
  const router = useRouter();
  const { profile, reset: resetAuth } = useAuthStore();
  const { remaining, reset: resetCredits } = useCreditsStore();
  const [open, setOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const displayName = profile?.full_name ?? profile?.email?.split("@")[0] ?? "User";
  const displayEmail = profile?.email ?? "";
  const planLabel = profile
    ? (profile.plan_id === "free" ? "Free Plan" : `${profile.plan_id.charAt(0).toUpperCase() + profile.plan_id.slice(1)} Plan`)
    : "";

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Best-effort; always redirect
    }
    resetAuth();
    resetCredits?.();
    router.push("/auth/login");
  }

  const menuItems: (MenuItem | "separator")[] = [
    { id: "profile", label: "View profile", icon: User, href: "/settings/account" },
    { id: "settings", label: "Workspace settings", icon: Settings, href: "/settings" },
    "separator",
    { id: "billing", label: "Billing", icon: CreditCard, href: "/settings/billing" },
    { id: "notifications", label: "Notifications", icon: Bell, href: "/settings/notifications" },
    { id: "referral", label: "Referral Program", icon: Gift, href: "/settings/account", badge: "Soon" },
    "separator",
    { id: "help", label: "Help Center", icon: HelpCircle, href: "/help" },
    "separator",
  ];

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="hidden cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-2 py-1 transition hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] sm:flex"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="text-right leading-tight">
          <p className="text-[12px] font-medium tracking-[-0.01em] text-foreground">
            {displayName}
          </p>
          {planLabel && (
            <p className="text-[11px] text-muted-foreground">{planLabel}</p>
          )}
        </div>
        <Avatar
          src={profile?.avatar_url ?? undefined}
          name={displayName}
          size="md"
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-[var(--radius-xl)] bg-background shadow-2xl ring-1 ring-border"
          >
            {/* User identity header */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <Avatar
                src={profile?.avatar_url ?? undefined}
                name={displayName}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground">{displayName}</p>
                <p className="truncate text-[11px] text-muted-foreground">{displayEmail}</p>
                {planLabel && (
                  <span className="mt-0.5 inline-flex rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                    {planLabel}
                  </span>
                )}
              </div>
            </div>

            {/* Credits usage row */}
            <div className="border-b border-border px-4 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Zap className="size-3.5 shrink-0 text-accent" strokeWidth={1.75} />
                  Credits remaining
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold tabular-nums text-foreground">
                    {remaining.toLocaleString()}
                  </span>
                  <Link
                    href="/credits"
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent transition hover:bg-accent/20"
                  >
                    Details
                  </Link>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="p-1.5">
              {menuItems.map((item, i) => {
                if (item === "separator") {
                  return <div key={`sep-${i}`} className="my-1 h-px bg-border/60 mx-1" />;
                }
                return <MenuRow key={item.id} item={item} onClose={() => setOpen(false)} />;
              })}

              {/* Dark mode inline toggle */}
              <DarkModeToggle onClose={() => setOpen(false)} />

              <div className="my-1 h-px bg-border/60 mx-1" />

              {/* Log out */}
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-red-500 transition hover:bg-red-500/8 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {loggingOut
                  ? <Loader2 className="size-4 shrink-0 animate-spin" />
                  : <LogOut className="size-4 shrink-0" strokeWidth={1.65} />
                }
                {loggingOut ? "Signing out…" : "Log out"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

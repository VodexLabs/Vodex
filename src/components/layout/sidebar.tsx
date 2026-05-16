"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight } from "lucide-react";
import { navSections } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";

type SidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
};

function NavSection({
  label,
  items,
  pathname,
  onMobileClose,
  collapsed,
}: {
  label?: string;
  items: typeof navSections[0]["items"];
  pathname: string;
  onMobileClose: () => void;
  collapsed: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && !collapsed && (
        <p className="mb-1 px-3 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/60 uppercase">
          {label}
        </p>
      )}
      {label && collapsed && (
        <div className="mx-auto my-1.5 h-px w-6 bg-border/60" />
      )}
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href ||
              pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.title}
            aria-current={active ? "page" : undefined}
            onClick={onMobileClose}
            className={cn(
              "group relative flex items-center gap-3 rounded-[var(--radius-md)] text-[13px] font-medium tracking-[-0.01em] transition duration-150 ease-out",
              collapsed
                ? "mx-auto w-10 justify-center px-0 py-2.5"
                : "px-3 py-2",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:bg-surface/70 hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-[var(--radius-md)] bg-surface shadow-[var(--shadow-xs)] ring-1 ring-border"
                transition={{ type: "spring", stiffness: 480, damping: 38 }}
              />
            )}
            <Icon
              className="relative z-10 size-[17px] shrink-0"
              strokeWidth={active ? 1.75 : 1.5}
            />
            {!collapsed && (
              <span className="relative z-10 truncate">{item.title}</span>
            )}
            {!collapsed && item.badge && (
              <span className="relative z-10 ml-auto rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(true);
  const { profile } = useAuthStore();

  // Filter out admin section for non-admins
  const visibleSections = navSections.filter(
    (s) => s.label !== "Admin" || profile?.is_admin,
  );

  const nav = (
    <nav
      className={cn(
        "flex flex-1 flex-col gap-3 overflow-y-auto pb-4 pt-3 scrollbar-none",
        collapsed ? "px-2" : "px-3",
      )}
    >
      {visibleSections.map((section, i) => (
        <NavSection
          key={i}
          label={section.label}
          items={section.items}
          pathname={pathname}
          onMobileClose={onMobileClose}
          collapsed={collapsed}
        />
      ))}
    </nav>
  );

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-foreground/10 backdrop-blur-[2px] lg:hidden"
            aria-label="Close menu"
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          // Mobile: fixed off-screen slide-in overlay
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-sidebar/90",
          "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "supports-[backdrop-filter]:bg-sidebar/75 supports-[backdrop-filter]:backdrop-blur-xl",
          // Desktop: static in flex row, fills full viewport height
          "lg:static lg:h-full lg:shrink-0",
          mobileOpen ? "translate-x-0 w-[220px]" : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-[60px]" : "lg:w-[200px]",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-border",
            collapsed ? "justify-center px-2" : "justify-between px-3",
          )}
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-visible:outline-none"
            onClick={onMobileClose}
            title="DreamOS86"
          >
            <span className="relative flex size-8 shrink-0 items-center justify-center">
              <Image
                src="/logo.png"
                alt="DreamOS86"
                width={32}
                height={32}
                className="object-contain drop-shadow-[0_2px_8px_rgba(30,107,255,0.25)]"
                priority
                loading="eager"
              />
            </span>
            {!collapsed && (
              <span className="truncate text-[13.5px] font-semibold tracking-[-0.03em] text-foreground">
                DreamOS86
              </span>
            )}
          </Link>
          <button
            type="button"
            className="lg:hidden inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            onClick={onMobileClose}
            aria-label="Close navigation"
          >
            <X className="size-4" strokeWidth={1.75} />
          </button>
          {!collapsed && (
            <button
              type="button"
              className="hidden lg:flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface hover:text-foreground"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
            >
              <ChevronRight className="size-3.5 rotate-180" strokeWidth={2} />
            </button>
          )}
        </div>

        {nav}

        {/* Expand button (collapsed state) */}
        {collapsed && (
          <div className="hidden lg:flex justify-center pb-4">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground/60 transition hover:bg-surface hover:text-foreground"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="size-3.5" strokeWidth={2} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

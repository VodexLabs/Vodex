"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Settings,
  User,
  CreditCard,
  Users,
  Cpu,
  Key,
  Plug2,
  Bell,
} from "lucide-react";

const navItems = [
  { label: "General", href: "/settings", icon: Settings },
  { label: "Account", href: "/settings/account", icon: User },
  { label: "Billing", href: "/settings/billing", icon: CreditCard },
  { label: "Team", href: "/settings/team", icon: Users },
  { label: "Models", href: "/settings/models", icon: Cpu },
  { label: "API Keys", href: "/settings/api-keys", icon: Key },
  { label: "Integrations", href: "/settings/integrations", icon: Plug2 },
  { label: "Notifications", href: "/settings/notifications", icon: Bell },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="max-w-5xl">
      {/* Mobile: horizontal scrollable tabs */}
      <div className="lg:hidden overflow-x-auto -mx-[var(--page-padding-x)] mb-6">
        <nav className="flex border-b border-border px-[var(--page-padding-x)] min-w-max">
          {navItems.map(({ label, href }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-3 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors duration-150",
                  isActive
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Desktop: sidebar + content */}
      <div className="flex gap-8 items-start">
        {/* Sidebar */}
        <aside className="hidden lg:block w-[190px] shrink-0">
          <nav className="sticky top-8 rounded-[var(--radius-xl)] bg-glass backdrop-blur-xl ring-1 ring-border shadow-[var(--shadow-card)] p-2 space-y-0.5">
            {navItems.map(({ label, href, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-md)] text-[13px] font-medium transition-all duration-150",
                    isActive
                      ? "bg-accent-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-[15px] shrink-0 transition-colors",
                      isActive ? "text-accent" : "text-muted-foreground",
                    )}
                    strokeWidth={1.6}
                  />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

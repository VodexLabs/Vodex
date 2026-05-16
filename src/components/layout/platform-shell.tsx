"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

const pageMeta: Record<string, { title: string; subtitle?: string }> = {
  "/projects": {
    title: "Your Apps",
    subtitle: "Everything you've brought to life — open, remix, or ship.",
  },
  "/templates": {
    title: "Templates",
    subtitle: "Start from a beautiful foundation.",
  },
  "/explore": {
    title: "Explore",
    subtitle: "Discover apps and ideas built by the community.",
  },
  "/chat": {
    title: "AI Chat",
    subtitle: "Talk to the world's best models in one place.",
  },
  "/deploy": {
    title: "Deployment Center",
    subtitle: "Manage environments, domains, and release pipelines.",
  },
  "/marketplace": {
    title: "Marketplace",
    subtitle: "Extensions, plugins, and community components.",
  },
  "/analytics": {
    title: "Analytics",
    subtitle: "Usage, credits, and generation insights.",
  },
  "/media": {
    title: "Media & Assets",
    subtitle: "Generated images, uploads, and asset organization.",
  },
  "/community": {
    title: "Community",
    subtitle: "Forums, showcases, and shared knowledge.",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Workspace, keys, and preferences.",
  },
  "/settings/account": {
    title: "Account",
    subtitle: "Profile, security, and personal preferences.",
  },
  "/settings/billing": {
    title: "Billing",
    subtitle: "Subscription, invoices, and payment methods.",
  },
  "/settings/team": {
    title: "Team",
    subtitle: "Members, roles, and collaboration settings.",
  },
  "/settings/models": {
    title: "AI Models",
    subtitle: "Model preferences, routing, and credit impact.",
  },
  "/settings/api-keys": {
    title: "API Keys",
    subtitle: "Manage keys for programmatic access.",
  },
  "/settings/integrations": {
    title: "Integrations",
    subtitle: "Connect GitHub, Vercel, Stripe, and more.",
  },
  "/settings/notifications": {
    title: "Notifications",
    subtitle: "Choose what you hear about and when.",
  },
  "/pricing": {
    title: "Pricing",
    subtitle: "Choose the plan that fits your ambitions.",
  },
  "/credits": {
    title: "Credits Usage",
    subtitle: "Real-time tracking of your AI spend.",
  },
  "/help": {
    title: "Help Center",
    subtitle: "Guides, docs, and support resources.",
  },
  "/changelog": {
    title: "Changelog",
    subtitle: "What's new in DreamOS86.",
  },
  "/onboarding": {
    title: "Welcome to DreamOS86",
    subtitle: "Let's get you set up.",
  },
};

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isCreateHome = pathname === "/";
  const meta = pageMeta[pathname] ?? { title: "DreamOS86" };

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    // h-screen + overflow-hidden ensures only the content area scrolls,
    // not the entire page — sidebar and topbar remain perfectly fixed.
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Right column: topbar + scrollable content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          mode={isCreateHome ? "create" : "standard"}
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuClick={() => setMobileOpen(true)}
        />

        {/* Only this scrolls — sidebar/topbar stay fixed */}
        <main
          className={
            isCreateHome
              ? "relative flex-1 overflow-y-auto overflow-x-hidden"
              : "relative flex-1 overflow-y-auto overflow-x-hidden bg-atmosphere px-[var(--page-padding-x)] py-[var(--page-padding-y)]"
          }
          style={{ scrollBehavior: "smooth" }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

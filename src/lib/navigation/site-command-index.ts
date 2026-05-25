import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  Compass,
  MessageSquare,
  Rocket,
  Store,
  BarChart3,
  Users,
  Settings2,
  Key,
  CreditCard,
  Gift,
  Globe,
  Bell,
  Sparkles,
  Home,
  Building,
  ScrollText,
  HelpCircle,
} from "lucide-react";

export type SiteCommandDef = {
  id: string;
  label: string;
  category: string;
  breadcrumb: string;
  href: string;
  keywords: string[];
  icon: LucideIcon;
};

/** Static pages + settings — apps are merged at runtime from /api/projects. */
export const SITE_COMMANDS: SiteCommandDef[] = [
  { id: "home", label: "Home", category: "Navigate", breadcrumb: "Home", href: "/", keywords: ["home", "dashboard", "start"], icon: Home },
  { id: "apps", label: "Your apps", category: "Apps", breadcrumb: "Apps", href: "/projects", keywords: ["apps", "projects", "my apps"], icon: LayoutGrid },
  { id: "templates", label: "Templates", category: "Navigate", breadcrumb: "Templates", href: "/templates", keywords: ["templates", "starter"], icon: Sparkles },
  { id: "explore", label: "Explore", category: "Navigate", breadcrumb: "Explore", href: "/explore", keywords: ["explore", "community", "discover"], icon: Compass },
  { id: "chat", label: "AI Chat", category: "Navigate", breadcrumb: "Chat", href: "/chat", keywords: ["chat", "ai", "models"], icon: MessageSquare },
  { id: "deploy", label: "Deploy", category: "Navigate", breadcrumb: "Deploy", href: "/deploy", keywords: ["deploy", "ship"], icon: Rocket },
  { id: "marketplace", label: "Marketplace", category: "Navigate", breadcrumb: "Marketplace", href: "/marketplace", keywords: ["marketplace", "plugins"], icon: Store },
  { id: "community", label: "Community", category: "Navigate", breadcrumb: "Community", href: "/community", keywords: ["community", "forum"], icon: Users },
  { id: "analytics", label: "Analytics", category: "Navigate", breadcrumb: "Analytics", href: "/analytics", keywords: ["analytics", "usage"], icon: BarChart3 },
  { id: "settings", label: "General", category: "Settings", breadcrumb: "Settings", href: "/settings", keywords: ["settings", "general", "workspace"], icon: Settings2 },
  { id: "settings-billing", label: "Billing", category: "Settings", breadcrumb: "Settings › Billing", href: "/settings/billing", keywords: ["billing", "subscription", "plan", "credits"], icon: CreditCard },
  { id: "settings-team", label: "Team", category: "Settings", breadcrumb: "Settings › Team", href: "/settings/team", keywords: ["team", "members", "invite"], icon: Users },
  { id: "settings-models", label: "Models", category: "Settings", breadcrumb: "Settings › Models", href: "/settings/models", keywords: ["models", "ai"], icon: Sparkles },
  { id: "settings-api-keys", label: "API Keys", category: "Keys", breadcrumb: "Settings › API Keys", href: "/settings/api-keys", keywords: ["api", "keys", "token", "developer"], icon: Key },
  { id: "settings-integrations", label: "Integrations", category: "Settings", breadcrumb: "Settings › Integrations", href: "/settings/integrations", keywords: ["integrations", "github", "supabase"], icon: Globe },
  { id: "settings-notifications", label: "Notifications", category: "Settings", breadcrumb: "Settings › Notifications", href: "/settings/notifications", keywords: ["notifications", "alerts"], icon: Bell },
  { id: "referrals", label: "Referrals", category: "Account", breadcrumb: "Referrals", href: "/referrals", keywords: ["referral", "invite"], icon: Gift },
  { id: "help", label: "Help", category: "Support", breadcrumb: "Help", href: "/help", keywords: ["help", "docs"], icon: HelpCircle },
  { id: "changelog", label: "Changelog", category: "Support", breadcrumb: "Changelog", href: "/changelog", keywords: ["changelog", "updates"], icon: ScrollText },
];

export function appCommandDef(project: { id: string; name: string }): SiteCommandDef {
  return {
    id: `app-${project.id}`,
    label: project.name || "Untitled App",
    category: "Apps",
    breadcrumb: `Apps › ${project.name || "Untitled App"}`,
    href: `/apps/${project.id}/builder`,
    keywords: [project.name.toLowerCase(), "app", "builder", "project"],
    icon: Building,
  };
}

export function matchCommands(
  query: string,
  apps: Array<{ id: string; name: string }>,
): SiteCommandDef[] {
  const all = [...SITE_COMMANDS, ...apps.map(appCommandDef)];
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.breadcrumb.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q) ||
      cmd.keywords.some((k) => k.includes(q)),
  );
}

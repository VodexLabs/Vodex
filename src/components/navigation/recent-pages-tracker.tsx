"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { recordRecentPage } from "@/lib/navigation/recent-pages";
import { SITE_COMMANDS, appCommandDef } from "@/lib/navigation/site-command-index";

/** Records deduped recent pages for command palette suggestions. */
export function RecentPagesTracker() {
  const pathname = usePathname();

  React.useEffect(() => {
    if (!pathname || pathname.startsWith("/auth")) return;

    const staticMatch = SITE_COMMANDS.find((c) => c.href === pathname);
    if (staticMatch) {
      recordRecentPage({
        id: staticMatch.id,
        label: staticMatch.label,
        href: staticMatch.href,
        category: staticMatch.category,
        breadcrumb: staticMatch.breadcrumb,
      });
      return;
    }

    const builderMatch = /^\/apps\/([^/]+)\/builder/.exec(pathname);
    if (builderMatch) {
      const appId = builderMatch[1]!;
      void fetch("/api/projects", { credentials: "include", cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { projects?: Array<{ id: string; name: string }> } | null) => {
          const project = data?.projects?.find((p) => p.id === appId);
          const def = appCommandDef({ id: appId, name: project?.name ?? "App" });
          recordRecentPage({
            id: def.id,
            label: def.label,
            href: def.href,
            category: def.category,
            breadcrumb: def.breadcrumb,
          });
        })
        .catch(() => {
          recordRecentPage({
            id: `app-${appId}`,
            label: "App builder",
            href: pathname,
            category: "Apps",
            breadcrumb: "Apps › Builder",
          });
        });
    }
  }, [pathname]);

  return null;
}

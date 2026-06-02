"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/** Scroll main content to top on route change (not help anchors / hash). */
export function RouteScrollToTop() {
  const pathname = usePathname();

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return;
    if (pathname.startsWith("/help/docs")) return;

    const main = document.querySelector("main");
    if (main && main.scrollHeight > main.clientHeight) {
      main.scrollTo({ top: 0, behavior: "auto" });
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

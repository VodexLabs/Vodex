"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Sidebar “Apps” — outline shelf of shipped tiles (distinct from dashboard grid icons). */
export const DreamAppsNavIcon = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  function DreamAppsNavIcon({ className, ...props }, ref) {
    return (
      <svg
        ref={ref}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        aria-hidden
        {...props}
      >
        {/* shelf */}
        <path
          d="M4.5 17.5v-7A2.5 2.5 0 0 1 7 8h10a2.5 2.5 0 0 1 2.5 2.5v7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* three app tiles */}
        <rect x="5" y="5.5" width="5" height="5" rx="1.25" stroke="currentColor" strokeWidth="1.35" />
        <rect x="9.5" y="4" width="5" height="5" rx="1.25" stroke="currentColor" strokeWidth="1.35" />
        <rect x="14" y="5.5" width="5" height="5" rx="1.25" stroke="currentColor" strokeWidth="1.35" />
        {/* small shipped / live dots */}
        <circle cx="7.25" cy="7.25" r="0.65" fill="currentColor" className="opacity-35" />
        <circle cx="12" cy="5.75" r="0.65" fill="currentColor" className="opacity-35" />
        <circle cx="16.75" cy="7.25" r="0.65" fill="currentColor" className="opacity-35" />
      </svg>
    );
  },
);

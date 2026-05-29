"use client";

import * as React from "react";
import { useHydrated } from "@/lib/hooks/use-hydrated";

/** Client URL params without `useSearchParams()` — avoids Suspense blocking the create shell. */
export function useClientSearchParams(): URLSearchParams {
  const hydrated = useHydrated();
  const [params, setParams] = React.useState(() => new URLSearchParams());

  React.useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const read = () => setParams(new URLSearchParams(window.location.search));
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [hydrated]);

  return params;
}

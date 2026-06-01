"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { isOnboardingExemptPath } from "@/lib/onboarding/exempt-paths";
import { isE2eCreditTestAccount } from "@/lib/credits/e2e-credit-account";

/**
 * Fast redirect for incomplete onboarding — avoids rendering dashboard behind a spinner.
 */
export function OnboardingAppGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const loading = useAuthStore((s) => s.loading);
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);

  const needsGate = Boolean(pathname && !pathname.startsWith("/onboarding"));
  const incomplete = profile?.onboarding_completed !== true;
  const exempt = isOnboardingExemptPath(pathname);
  const e2e = isE2eCreditTestAccount(profile?.email ?? user?.email);

  const target =
    pathname && needsGate && incomplete && !exempt && !e2e
      ? `/onboarding?next=${encodeURIComponent(pathname)}`
      : null;

  React.useEffect(() => {
    if (!target || loading) return;
    router.replace(target);
    const hard = window.setTimeout(() => {
      if (window.location.pathname.startsWith("/onboarding")) return;
      window.location.replace(target);
    }, 800);
    return () => window.clearTimeout(hard);
  }, [target, loading, router]);

  if (!needsGate) return <>{children}</>;

  if (loading && !profile?.id) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-accent" strokeWidth={1.6} />
        <p className="text-[12px]">Signing you in…</p>
      </div>
    );
  }

  if (target) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-accent" strokeWidth={1.6} />
        <p className="text-[12px]">Opening onboarding…</p>
      </div>
    );
  }

  return <>{children}</>;
}

"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useOnboardingComplete } from "@/hooks/use-onboarding-complete";
import { isOnboardingExemptPath } from "@/lib/onboarding/exempt-paths";
import { isE2eCreditTestAccount } from "@/lib/credits/e2e-credit-account";

/**
 * Fast redirect for incomplete onboarding — avoids rendering dashboard behind a spinner.
 * Uses API verification so stale bootstrap cache cannot re-trigger the wizard.
 */
export function OnboardingAppGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const loading = useAuthStore((s) => s.loading);
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const { complete, checking, needsOnboarding } = useOnboardingComplete();

  const needsGate = Boolean(pathname && !pathname.startsWith("/onboarding"));
  const exempt = isOnboardingExemptPath(pathname);
  const e2e = isE2eCreditTestAccount(profile?.email ?? user?.email);

  const shouldRedirect =
    needsGate && needsOnboarding && !complete && !exempt && !e2e && !checking;

  const target =
    pathname && shouldRedirect
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

  if ((loading && !profile?.id) || (checking && !complete)) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-accent" strokeWidth={1.6} />
        <p className="text-[12px]">{loading ? "Signing you in…" : "Checking setup…"}</p>
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

"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useOnboardingComplete } from "@/hooks/use-onboarding-complete";
import { isOnboardingExemptPath } from "@/lib/onboarding/exempt-paths";
import { isE2eCreditTestAccount } from "@/lib/credits/e2e-credit-account";
import { hasActiveSession } from "@/lib/auth/client-identity";

const GATE_MAX_MS = 3_500;

/**
 * Fast redirect for incomplete onboarding — avoids rendering dashboard behind a spinner.
 * Uses API verification so stale bootstrap cache cannot re-trigger the wizard.
 */
export function OnboardingAppGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const loading = useAuthStore((s) => s.loading);
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const { complete, checking, needsOnboarding } = useOnboardingComplete();
  const [gateTimedOut, setGateTimedOut] = React.useState(false);

  const needsGate = Boolean(pathname && !pathname.startsWith("/onboarding"));
  const exempt = isOnboardingExemptPath(pathname);
  const e2e = isE2eCreditTestAccount(profile?.email ?? user?.email);
  const sessionActive = hasActiveSession(session, user);

  React.useEffect(() => {
    if (!needsGate) return;
    const t = window.setTimeout(() => setGateTimedOut(true), GATE_MAX_MS);
    return () => window.clearTimeout(t);
  }, [needsGate, pathname]);

  const shouldRedirect =
    needsGate && needsOnboarding && !complete && !exempt && !e2e && !checking;

  const target =
    pathname && shouldRedirect
      ? `/onboarding?next=${encodeURIComponent(pathname)}`
      : null;

  React.useEffect(() => {
    if (!target || (loading && !sessionActive && !gateTimedOut)) return;
    router.replace(target);
    const hard = window.setTimeout(() => {
      if (window.location.pathname.startsWith("/onboarding")) return;
      window.location.replace(target);
    }, 800);
    return () => window.clearTimeout(hard);
  }, [target, loading, sessionActive, gateTimedOut, router]);

  if (!needsGate) return <>{children}</>;

  const waitingForAuth = loading && !profile?.id && !sessionActive && !gateTimedOut;
  const waitingForOnboardingCheck = checking && !complete && !gateTimedOut;

  if (waitingForAuth || waitingForOnboardingCheck) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-accent" strokeWidth={1.6} />
        <p className="text-[12px]">
          {waitingForAuth ? "Signing you in…" : "Checking setup…"}
        </p>
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

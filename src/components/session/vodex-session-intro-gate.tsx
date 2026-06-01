"use client";

import * as React from "react";
import { VodexSessionIntro, shouldShowSessionIntro } from "@/components/session/vodex-session-intro";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useOnboardingComplete } from "@/hooks/use-onboarding-complete";
import { runSessionPreload } from "@/lib/bootstrap/session-preload";
import { isLightweightPublicPath } from "@/lib/routing/lightweight-public-paths";
import { hasActiveSession } from "@/lib/auth/client-identity";
import { usePathname } from "next/navigation";

const INTRO_GATE_MAX_MS = 3_500;

/**
 * Premium 2.4s intro on first authenticated entry per browser session.
 * Preloads credits/projects behind the overlay; skips internal navigation.
 */
export function VodexSessionIntroGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const loading = useAuthStore((s) => s.loading);
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { complete, checking } = useOnboardingComplete();
  const [introVisible, setIntroVisible] = React.useState(false);
  const [appReady, setAppReady] = React.useState(() => !shouldShowSessionIntro());
  const [gateTimedOut, setGateTimedOut] = React.useState(false);

  const sessionActive = hasActiveSession(session, user);

  React.useEffect(() => {
    const t = window.setTimeout(() => setGateTimedOut(true), INTRO_GATE_MAX_MS);
    return () => window.clearTimeout(t);
  }, []);

  React.useEffect(() => {
    if (isLightweightPublicPath(pathname)) {
      setAppReady(true);
      setIntroVisible(false);
      return;
    }
    const authPending = loading && !sessionActive && !profile?.id && !gateTimedOut;
    if (authPending || (checking && !complete && !gateTimedOut)) return;

    if (!user?.id && !profile?.id) {
      setAppReady(true);
      setIntroVisible(false);
      return;
    }
    if (!complete) {
      setAppReady(true);
      setIntroVisible(false);
      return;
    }
    if (!shouldShowSessionIntro()) {
      setAppReady(true);
      setIntroVisible(false);
      return;
    }
    setIntroVisible(true);
    setAppReady(false);
    runSessionPreload(user?.id ?? profile?.id ?? "", profile);
  }, [
    loading,
    checking,
    user?.id,
    profile?.id,
    complete,
    pathname,
    sessionActive,
    gateTimedOut,
  ]);

  const onIntroDone = React.useCallback(() => {
    setIntroVisible(false);
    setAppReady(true);
  }, []);

  const showAuthSpinner =
    !appReady &&
    !introVisible &&
    loading &&
    !sessionActive &&
    !profile?.id &&
    !gateTimedOut;

  if (showAuthSpinner) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <p className="text-[12px]">Signing you in…</p>
      </div>
    );
  }

  return (
    <>
      {introVisible ? <VodexSessionIntro show onDone={onIntroDone} /> : null}
      {appReady ? children : null}
    </>
  );
}

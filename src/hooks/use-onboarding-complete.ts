"use client";

import * as React from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Profile } from "@/lib/supabase/types";
import {
  applyOnboardingCompleteToClient,
  fetchOnboardingCompleteFromApi,
  hasSessionOnboardingComplete,
  isProfileOnboardingComplete,
} from "@/lib/onboarding/onboarding-status";

/**
 * Resolves onboarding completion for gates — avoids loops from stale bootstrap cache.
 */
export function useOnboardingComplete() {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const setProfile = useAuthStore((s) => s.setProfile);
  const userId = profile?.id ?? user?.id;

  const [verified, setVerified] = React.useState<boolean | null>(null);
  const [checking, setChecking] = React.useState(false);

  const profileComplete = isProfileOnboardingComplete(profile);
  const sessionComplete = hasSessionOnboardingComplete(userId);

  React.useEffect(() => {
    if (!userId) {
      setVerified(null);
      return;
    }
    if (profileComplete || sessionComplete) {
      setVerified(true);
      return;
    }

    let cancelled = false;
    setChecking(true);
    const checkTimer = window.setTimeout(() => {
      if (!cancelled) setChecking(false);
    }, 4_500);
    void (async () => {
      const apiComplete = await fetchOnboardingCompleteFromApi();
      if (cancelled) return;
      if (apiComplete && profile) {
        applyOnboardingCompleteToClient(userId, profile as Profile, setProfile);
      }
      setVerified(apiComplete);
      setChecking(false);
      window.clearTimeout(checkTimer);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(checkTimer);
    };
  }, [userId, profileComplete, sessionComplete, profile, setProfile]);

  const complete =
    profileComplete || sessionComplete || verified === true;

  return {
    complete,
    checking: checking && !complete,
    needsOnboarding: userId ? !complete : false,
  };
}

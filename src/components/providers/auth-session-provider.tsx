"use client";

import * as React from "react";
import { ReferralCapture } from "@/components/referrals/referral-capture";
import { useAuthStore } from "@/lib/stores/auth-store";
import { installChunkLoadRecovery } from "@/lib/navigation/chunk-load-recovery";

/** Minimal auth bootstrap for /auth routes — no command palette or credits sync. */
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    void useAuthStore.persist.rehydrate();
    return installChunkLoadRecovery();
  }, []);

  return (
    <>
      <ReferralCapture />
      {children}
    </>
  );
}

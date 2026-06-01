"use client";

import * as React from "react";
import { CommandCenter } from "@/components/command/command-center";
import { RecentPagesTracker } from "@/components/navigation/recent-pages-tracker";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { ReferralGuard } from "@/components/referrals/referral-guard";
import { ReferralNoticeHandler } from "@/components/referrals/referral-notice-handler";

/** Heavy app chrome — loaded only on authenticated app routes (not /auth or marketing). */
export function AppChromeExtras() {
  return (
    <>
      <NavigationProgress />
      <RecentPagesTracker />
      <React.Suspense fallback={null}>
        <ReferralGuard />
        <ReferralNoticeHandler />
      </React.Suspense>
      <CommandCenter />
    </>
  );
}

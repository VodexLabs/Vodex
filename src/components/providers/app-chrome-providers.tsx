"use client";

import dynamic from "next/dynamic";
import { AppProvider } from "@/components/providers/app-provider";
import { AppearanceProvider } from "@/components/providers/appearance-provider";
import { CreditsServerHydrator } from "@/components/providers/credits-server-hydrator";
import { VodexSessionIntroGate } from "@/components/session/vodex-session-intro-gate";
import { Toaster } from "@/components/ui/toaster";
import type { CanonicalCreditsPayload } from "@/lib/credits/canonical-credits";

const AppChromeExtras = dynamic(
  () =>
    import("@/components/providers/app-chrome-extras").then((m) => m.AppChromeExtras),
  { ssr: false },
);

/** Full authenticated app shell providers — not used on /auth or static marketing pages. */
export function AppChromeProviders({
  children,
  serverUserId,
  initialCredits,
  pendingLoginIntro = false,
}: {
  children: React.ReactNode;
  serverUserId: string;
  initialCredits: CanonicalCreditsPayload | null;
  pendingLoginIntro?: boolean;
}) {
  return (
    <AppProvider>
      <CreditsServerHydrator userId={serverUserId} initialCredits={initialCredits} />
      <AppearanceProvider>
        <AppChromeExtras />
        <VodexSessionIntroGate
          serverUserId={serverUserId}
          pendingLoginIntro={pendingLoginIntro}
        >
          {children}
        </VodexSessionIntroGate>
        <Toaster />
      </AppearanceProvider>
    </AppProvider>
  );
}

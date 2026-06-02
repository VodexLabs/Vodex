import { PlatformShell } from "@/components/layout/platform-shell";
import { OnboardingAppGate } from "@/components/onboarding/onboarding-app-gate";
import { AppChromeProviders } from "@/components/providers/app-chrome-providers";
import { loadAuthenticatedShellProps } from "@/lib/session/authenticated-shell-props";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const shell = await loadAuthenticatedShellProps();

  if (!shell) {
    return <>{children}</>;
  }

  return (
    <AppChromeProviders
      serverUserId={shell.userId}
      initialCredits={shell.initialCredits}
      pendingLoginIntro={shell.pendingLoginIntro}
    >
      <PlatformShell homeSessionFromServer>
        <OnboardingAppGate>{children}</OnboardingAppGate>
      </PlatformShell>
    </AppChromeProviders>
  );
}

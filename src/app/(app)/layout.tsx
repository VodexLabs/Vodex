import { PlatformShell } from "@/components/layout/platform-shell";
import { OnboardingAppGate } from "@/components/onboarding/onboarding-app-gate";
import { AppChromeProviders } from "@/components/providers/app-chrome-providers";
import { getServerSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerSessionUser();

  if (!user) {
    return <>{children}</>;
  }

  return (
    <AppChromeProviders>
      <PlatformShell homeSessionFromServer>
        <OnboardingAppGate>{children}</OnboardingAppGate>
      </PlatformShell>
    </AppChromeProviders>
  );
}

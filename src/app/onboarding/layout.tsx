import { AppChromeProviders } from "@/components/providers/app-chrome-providers";
import { loadAuthenticatedShellProps } from "@/lib/session/authenticated-shell-props";

export const dynamic = "force-dynamic";

/**
 * Full-screen onboarding — no PlatformShell sidebar or top bar.
 */
export default async function OnboardingRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shell = await loadAuthenticatedShellProps();

  if (!shell) {
    return (
      <div className="relative min-h-[100dvh] overflow-x-hidden bg-background">{children}</div>
    );
  }

  return (
    <AppChromeProviders
      serverUserId={shell.userId}
      initialCredits={shell.initialCredits}
      pendingLoginIntro={shell.pendingLoginIntro}
    >
      <div className="relative min-h-[100dvh] overflow-x-hidden bg-background">{children}</div>
    </AppChromeProviders>
  );
}

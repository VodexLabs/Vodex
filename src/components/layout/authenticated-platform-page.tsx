import { PlatformShell } from "@/components/layout/platform-shell";
import { AppChromeProviders } from "@/components/providers/app-chrome-providers";
import { loadAuthenticatedShellProps } from "@/lib/session/authenticated-shell-props";

/**
 * Signed-in pages outside `(app)/layout` still need AppChromeProviders
 * (OverlayProvider, auth, credits) — e.g. /pricing, /contact, /terms.
 */
export async function AuthenticatedPlatformPage({
  children,
  testId,
}: {
  children: React.ReactNode;
  testId?: string;
}) {
  const shell = await loadAuthenticatedShellProps();
  if (!shell) return null;

  return (
    <AppChromeProviders
      serverUserId={shell.userId}
      initialCredits={shell.initialCredits}
      pendingLoginIntro={shell.pendingLoginIntro}
    >
      <PlatformShell homeSessionFromServer>
        {testId ? <div data-testid={testId}>{children}</div> : children}
      </PlatformShell>
    </AppChromeProviders>
  );
}

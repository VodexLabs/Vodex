import { AppChromeProviders } from "@/components/providers/app-chrome-providers";
import { loadAuthenticatedShellProps } from "@/lib/session/authenticated-shell-props";

export const dynamic = "force-dynamic";

/**
 * Workspace layout — fully isolated, no platform shell.
 */
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shell = await loadAuthenticatedShellProps();

  if (!shell) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-background">{children}</div>
    );
  }

  return (
    <AppChromeProviders
      serverUserId={shell.userId}
      initialCredits={shell.initialCredits}
      pendingLoginIntro={shell.pendingLoginIntro}
    >
      <div className="h-screen w-screen overflow-hidden bg-background">{children}</div>
    </AppChromeProviders>
  );
}

import { AppChromeProviders } from "@/components/providers/app-chrome-providers";

export const dynamic = "force-dynamic";

/**
 * Workspace layout — fully isolated, no platform shell.
 *
 * The creation workspace is a focused building environment.
 * No sidebar, no topbar, no navigation clutter.
 * The workspace chrome is self-contained inside the page.
 */
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppChromeProviders>
      <div className="h-screen w-screen overflow-hidden bg-background">{children}</div>
    </AppChromeProviders>
  );
}

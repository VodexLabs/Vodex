import { AppChromeProviders } from "@/components/providers/app-chrome-providers";

export const dynamic = "force-dynamic";

/**
 * Full-screen onboarding — no PlatformShell sidebar or top bar.
 * Route: /onboarding (outside the (app) route group).
 */
export default function OnboardingRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppChromeProviders>
      <div className="relative min-h-[100dvh] overflow-x-hidden bg-background">{children}</div>
    </AppChromeProviders>
  );
}

import { AuthenticatedPlatformPage } from "@/components/layout/authenticated-platform-page";
import { PublicMarketingShell } from "@/components/marketing/public-marketing-shell";
import { PricingView } from "@/components/pricing/pricing-view";
import { getServerSessionUser } from "@/lib/auth/session";

/**
 * Single /pricing route: app shell when signed in, public marketing shell when signed out.
 */
export async function PricingPageShell() {
  const user = await getServerSessionUser();

  if (user) {
    return (
      <AuthenticatedPlatformPage testId="app-pricing-page">
        <PricingView />
      </AuthenticatedPlatformPage>
    );
  }

  return (
    <PublicMarketingShell className="bg-atmosphere">
      <div data-testid="public-pricing-page" className="pb-16">
        <PricingView publicMode />
      </div>
    </PublicMarketingShell>
  );
}

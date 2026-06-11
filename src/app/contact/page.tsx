import type { Metadata } from "next";
import { ContactPageContent } from "@/components/marketing/contact-page-content";
import { PublicMarketingShell } from "@/components/marketing/public-marketing-shell";
import { AuthenticatedPlatformPage } from "@/components/layout/authenticated-platform-page";
import { getServerSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Vodex — sales, support, billing, and product feedback.",
};

/**
 * Logged-in users keep PlatformShell so session/UI stay consistent (no public-only header).
 * Guests see the public marketing shell.
 */
export default async function ContactPage() {
  const user = await getServerSessionUser();

  if (user) {
    return (
      <AuthenticatedPlatformPage>
        <ContactPageContent embedded />
      </AuthenticatedPlatformPage>
    );
  }

  return (
    <PublicMarketingShell>
      <ContactPageContent />
    </PublicMarketingShell>
  );
}

import type { Metadata } from "next";
import { PublicMarketingShell } from "@/components/marketing/public-marketing-shell";
import { RefundContent } from "@/components/marketing/legal/refund-content";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "DreamOS86 refund policy for subscriptions, Build Credits, Action Credits, and generated app payments.",
};

export default function RefundsPage() {
  return (
    <PublicMarketingShell>
      <RefundContent />
    </PublicMarketingShell>
  );
}

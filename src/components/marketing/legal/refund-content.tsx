import { LegalParagraph, LegalProse, LegalSection } from "@/components/marketing/legal-document";
import Link from "next/link";

const SUPPORT_EMAIL = "support@dreamos86.com";

export function RefundContent() {
  return (
    <LegalProse>
      <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
        Last updated: May 19, 2026
      </p>
      <h1 className="mt-2 text-balance text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">
        Refund Policy
      </h1>
      <p className="mt-4 text-muted-foreground">
        DreamOS86 provides digital software, SaaS subscriptions, AI app-building tools, usage credits, publishing
        tools, and related digital services.
      </p>

      <LegalSection title="General policy">
        <LegalParagraph>
          Because our services include immediate access to digital tools, AI usage, compute resources, and usage-based
          credits, payments are generally non-refundable once access has been provided or credits have been used.
        </LegalParagraph>
        <LegalParagraph>
          Subscription refunds may be considered only in limited cases, such as duplicate charges, billing errors,
          accidental renewal requests made shortly after renewal, or situations where DreamOS86 is unable to provide
          the purchased service.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Usage credits">
        <LegalParagraph>
          Usage credits, including Build Credits and Action Credits, are generally non-refundable once granted or used,
          because they may represent consumed AI, infrastructure, email, media, or provider costs.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Subscription cancellation">
        <LegalParagraph>
          If you cancel your subscription, you will keep access until the end of the current billing period unless stated
          otherwise. Canceling a subscription does not automatically create a refund for the current billing period.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Generated apps and third-party payments">
        <LegalParagraph>
          Generated apps may allow their owners to connect third-party payment processors. DreamOS86 is not
          responsible for refunds, chargebacks, disputes, taxes, payment processor approvals, or customer payments
          handled through a generated app owner&apos;s own payment processor.
        </LegalParagraph>
        <LegalParagraph>
          For more on platform billing versus app-owner payments, see our{" "}
          <Link href="/terms" className="text-accent hover:underline underline-offset-4">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/help/docs/app-payments-vs-dreamos-billing" className="text-accent hover:underline underline-offset-4">
            Help Center
          </Link>
          .
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="How to request a refund review">
        <LegalParagraph>
          To request a refund review, contact us at{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-accent hover:underline underline-offset-4"
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          with your account email, payment date, and reason for the request.
        </LegalParagraph>
        <LegalParagraph>
          DreamOS86 reserves the right to approve or deny refund requests at its discretion, subject to applicable law.
        </LegalParagraph>
      </LegalSection>
    </LegalProse>
  );
}

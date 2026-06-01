import { LegalParagraph, LegalProse, LegalSection } from "@/components/marketing/legal-document";
import Link from "next/link";
import { LEGAL_COMPANY_NAME, SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/brand/brand-config";

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
        Vodex is sold through Paddle, our merchant of record. Paddle handles payments, taxes, invoices,
        subscriptions, cancellations, and eligible refunds for Vodex platform purchases made through Paddle
        checkout. {LEGAL_COMPANY_NAME} operates the Vodex software platform.
      </p>

      <LegalSection title="Refund window">
        <LegalParagraph>
          Customers may request a refund within <strong className="text-foreground">14 days</strong> of purchase,
          unless a longer period is required by applicable law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Subscriptions">
        <LegalParagraph>
          You may cancel a subscription at any time. Cancellation stops future renewals. Access remains available until
          the end of the current billing period unless otherwise required by law.
        </LegalParagraph>
        <LegalParagraph>
          Canceling a subscription does not automatically refund the current billing period unless you are eligible
          under this policy or applicable law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="When refunds may be available">
        <LegalParagraph>Refunds may be available where:</LegalParagraph>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>required by applicable law;</li>
          <li>there was a duplicate charge;</li>
          <li>
            the purchase was accidental and the request is made within the{" "}
            <strong className="text-foreground">14-day</strong> refund window;
          </li>
          <li>
            the service was not delivered or was materially unavailable due to a technical issue on our side;
          </li>
          <li>
            Paddle determines the buyer is eligible under Paddle&apos;s buyer terms or refund process.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Usage credits">
        <LegalParagraph>
          Build Credits, Action Credits, and other usage-based allowances represent delivered digital capacity and
          provider costs. Refunds are not guaranteed for credits that have already been consumed, except where required
          by law or approved by Paddle. We do not guarantee refunds for dissatisfaction beyond the{" "}
          <strong className="text-foreground">14-day</strong> refund window.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Abuse and policy violations">
        <LegalParagraph>
          We do not guarantee refunds for abuse, misuse, policy violations, fraud, or chargeback abuse, except where
          required by law or approved by Paddle. Nothing in this policy limits statutory consumer rights that cannot be
          waived.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Generated apps and third-party payments">
        <LegalParagraph>
          Apps you publish may use your own payment processors. Vodex is not responsible for refunds, chargebacks, or
          customer payments handled through a generated app owner&apos;s processor. See our{" "}
          <Link href="/terms" className="text-accent hover:underline underline-offset-4">
            Terms of Service
          </Link>
          .
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="How to request a refund">
        <LegalParagraph>
          Refunds are processed by Paddle. You may request a refund through Paddle&apos;s buyer support or by contacting{" "}
          <a href={SUPPORT_MAILTO} className="text-accent hover:underline underline-offset-4">
            {SUPPORT_EMAIL}
          </a>{" "}
          with your account email, payment date, and reason for the request. We will help route eligible requests to
          Paddle when appropriate.
        </LegalParagraph>
      </LegalSection>
    </LegalProse>
  );
}

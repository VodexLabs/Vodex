import { LegalParagraph, LegalProse, LegalSection } from "@/components/marketing/legal-document";
import Link from "next/link";
import {
  APP_URL,
  LEGAL_COMPANY_NAME,
  PUBLISHED_APP_EXAMPLE_HOST,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO,
} from "@/lib/brand/brand-config";

export function TermsContent() {
  return (
    <LegalProse>
      <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
        Effective date: May 2026
      </p>
      <h1 className="mt-2 text-balance text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">
        Terms of Service
      </h1>
      <p className="mt-4 text-muted-foreground">
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Vodex platform, website,
        APIs, and related services (collectively, the &quot;Service&quot;) operated by {LEGAL_COMPANY_NAME}{" "}
        (&quot;Vodex,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By creating an account or using
        the Service, you agree to these Terms. If you do not agree, do not use the Service.
      </p>

      <LegalSection title="1. What Vodex is">
        <LegalParagraph>
          Vodex is an AI-native software workspace. You describe applications in natural language; the Service helps
          generate project files, previews, and deployment workflows. Vodex hosts web previews on subdomains we
          provide (for example,{" "}
          <span className="font-mono text-foreground">{PUBLISHED_APP_EXAMPLE_HOST}</span>
          ) when you choose to publish. Mobile app packaging and store submission features depend on your plan and
          project configuration — they are not guaranteed for every project.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="2. Accounts and eligibility">
        <LegalParagraph>
          You must provide accurate registration information and keep your credentials secure. You are responsible for
          all activity under your account. You must be at least 13 years old (or the minimum age required in your
          jurisdiction) to use the Service. If you use the Service on behalf of an organization, you represent that you
          have authority to bind that organization to these Terms.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="3. Acceptable use">
        <LegalParagraph>
          You agree not to misuse the Service. Prohibited conduct includes: violating applicable law; infringing
          intellectual property or privacy rights; distributing malware; attempting unauthorized access to systems or
          data; harassing others; generating or publishing illegal, fraudulent, or harmful content; circumventing usage
          limits or billing; or reselling access without our written permission.
        </LegalParagraph>
        <LegalParagraph>
          We may investigate violations and suspend or terminate accounts that pose risk to users, providers, or the
          Service.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="4. AI-generated output">
        <LegalParagraph>
          The Service uses third-party AI models to produce code, text, designs, and other materials (&quot;Output&quot;).
          Output may be inaccurate, incomplete, or unsuitable for production without review. You are solely responsible
          for reviewing, testing, securing, and deploying Output before relying on it.
        </LegalParagraph>
        <LegalParagraph>
          Vodex does not warrant that Output is error-free, secure, or compliant with any law or third-party policy.
          You must not represent AI-generated apps as human-authored where disclosure is required by law or platform rules.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="5. Your apps and publishing">
        <LegalParagraph>
          You retain ownership of content you submit and apps you create, subject to these Terms and third-party license
          terms for integrated services. You grant Vodex a limited license to host, process, display, and back up your
          content as needed to operate the Service.
        </LegalParagraph>
        <LegalParagraph>
          When you publish to a Vodex subdomain or connected hosting, you are responsible for the published
          application&apos;s content, accessibility, and compliance. We do not guarantee app-store approval, uptime of
          third-party stores, or that every generated app meets platform review guidelines.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="6. Tokens, billing, and subscriptions">
        <LegalParagraph>
          Certain features consume Build Credits and Action Credits (also shown as usage credits or tokens in parts of the
          product). Credits are deducted only after successful operations as described in the product UI. Free and paid
          plans include different monthly allowances; unused monthly plan credits do not roll over unless stated otherwise
          at purchase.
        </LegalParagraph>
        <LegalParagraph>
          Prices, plan limits, and renewal terms are shown on our{" "}
          <Link href="/pricing" className="text-accent hover:underline underline-offset-4">
            pricing page
          </Link>{" "}
          and at checkout. You may cancel subscriptions according to the billing portal instructions. Refunds are
          handled per our{" "}
          <Link href="/refunds" className="text-accent hover:underline underline-offset-4">
            Refund Policy
          </Link>{" "}
          unless required by law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="7. Platform purchases through Paddle">
        <LegalParagraph>
          {LEGAL_COMPANY_NAME} supplies and operates Vodex. For many paid platform subscriptions,{" "}
          <strong className="text-foreground">Paddle</strong> is the merchant of record and authorized reseller. Paddle
          may process payments, calculate and remit applicable taxes, issue invoices, manage subscription renewals and
          cancellations, and handle eligible refunds for those purchases.
        </LegalParagraph>
        <LegalParagraph>
          When you buy a Vodex subscription through Paddle checkout, you are also subject to Paddle&apos;s applicable
          buyer terms and policies. Nothing in these Terms limits mandatory consumer rights that apply to you.
        </LegalParagraph>
        <LegalParagraph>
          Questions about platform billing may be sent to{" "}
          <a href={SUPPORT_MAILTO} className="text-accent hover:underline underline-offset-4">
            {SUPPORT_EMAIL}
          </a>
          . For refund eligibility, see our{" "}
          <Link href="/refunds" className="text-accent hover:underline underline-offset-4">
            Refund Policy
          </Link>
          .
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="8. Payments and third-party billing (generated apps)">
        <LegalParagraph>
          Vodex may offer connectors for payment and billing providers such as Paddle, Stripe, Lemon Squeezy,
          PayPal, RevenueCat, Google Play Billing, Apple In-App Purchases, and other processors. For generated apps, you
          choose and connect your own payment provider accounts. Vodex is not your merchant of record for your
          customers unless we explicitly agree otherwise in writing.
        </LegalParagraph>
        <LegalParagraph>
          Vodex is not responsible for approval, rejection, suspension, holds, reserves, fees, refunds, taxes,
          chargebacks, disputes, fraud reviews, payout delays, account termination, or compliance decisions made by
          third-party processors or app stores. You are responsible for complying with applicable laws, tax rules, store
          policies, processor terms, consumer protection laws, refund obligations, privacy laws, and subscription
          cancellation requirements for your own customers and products.
        </LegalParagraph>
        <LegalParagraph>
          You must provide accurate billing, product, tax, and legal information. Vodex may disable integrations that
          appear abusive, fraudulent, unlawful, or unsafe. For mobile apps, you are responsible for Google Play and Apple
          App Store billing policies. Vodex does not guarantee app store approval. Setup guidance is not legal, tax,
          payment, or financial advice. Vodex&apos;s own platform subscriptions and Build Credits may be billed
          through Paddle or another platform billing provider separate from your generated app connectors.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="9. Integrations and third-party services">
        <LegalParagraph>
          The Service may connect to Supabase, Stripe, GitHub, Vercel, email providers, Slack, and AI providers, among
          others. Your use of those services is subject to their terms and privacy policies. Vodex is not responsible
          for third-party outages, pricing changes, or data handling outside our control.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="10. Secrets and API keys">
        <LegalParagraph>
          You may store project secrets (for example, API keys) in Vodex for deployment and integrations. Secrets are
          stored server-side and are not intentionally exposed in client-side code or public previews. You are
          responsible for rotating compromised keys and limiting secret scope. Do not commit secrets to generated
          repositories you make public.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="11. Intellectual property">
        <LegalParagraph>
          Vodex, its logos, and the Service software are owned by {LEGAL_COMPANY_NAME} and its licensors. Except for the
          rights expressly granted, no license is granted to our trademarks or underlying platform code. Feedback you
          provide may be used to improve the Service without obligation to you.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="12. Service availability and changes">
        <LegalParagraph>
          We strive for reliable operation but do not guarantee uninterrupted access. We may modify, suspend, or
          discontinue features with reasonable notice when practicable. Beta or experimental features may change or be
          withdrawn without notice.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="13. Termination">
        <LegalParagraph>
          You may stop using the Service and delete your account through available settings. We may suspend or terminate
          access for breach of these Terms, legal requirements, or risk to the Service. Upon termination, your right to
          use the Service ends; we may delete or retain data per our Privacy Policy and applicable law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="14. Disclaimers">
        <LegalParagraph>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER
          EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO
          NOT WARRANT THAT THE SERVICE OR OUTPUT WILL MEET YOUR REQUIREMENTS OR BE FREE OF DEFECTS OR SECURITY
          VULNERABILITIES.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="15. Limitation of liability">
        <LegalParagraph>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, {LEGAL_COMPANY_NAME.toUpperCase()} AND ITS AFFILIATES WILL NOT BE
          LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA,
          OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE OR OUTPUT. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE
          SERVICE IS LIMITED TO THE GREATER OF (A) AMOUNTS YOU PAID TO {LEGAL_COMPANY_NAME.toUpperCase()} IN THE TWELVE
          MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS (USD $100).
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="16. Changes to these Terms">
        <LegalParagraph>
          We may update these Terms from time to time. We will post the revised Terms on this page and update the
          effective date. Material changes may be communicated via email or in-product notice. Continued use after changes
          take effect constitutes acceptance.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="17. Contact">
        <LegalParagraph>
          Questions about these Terms:{" "}
          <a href={SUPPORT_MAILTO} className="text-accent hover:underline underline-offset-4">
            {SUPPORT_EMAIL}
          </a>
          , our{" "}
          <Link href="/contact" className="text-accent hover:underline underline-offset-4">
            contact form
          </Link>
          , or {APP_URL}.
        </LegalParagraph>
      </LegalSection>
    </LegalProse>
  );
}

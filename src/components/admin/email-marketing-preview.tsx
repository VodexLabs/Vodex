"use client";

import * as React from "react";
import type { MarketingEmailTemplate } from "@/lib/email/marketing-email-templates";

type Props = {
  template: MarketingEmailTemplate;
  appUrl?: string;
  name?: string;
};

export function EmailMarketingPreview({ template, appUrl, name }: Props) {
  const origin =
    appUrl ?? (typeof window !== "undefined" ? window.location.origin : "https://vodex.dev");

  const srcDoc = template.buildHtml({
    appUrl: origin,
    unsubscribeUrl: `${origin}/settings/notifications`,
    name,
  });

  return (
    <div className="rounded-xl border border-border bg-[#e8eef5] p-4 dark:bg-slate-900/40">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Full email preview (680px)
      </p>
      <p className="mb-3 text-[12px] font-medium text-foreground">{template.subject}</p>
      <p className="mb-3 text-[11px] text-muted-foreground">{template.preheader}</p>
      <div className="max-h-[min(78vh,900px)] overflow-y-auto rounded-lg bg-[#dbe4ee] p-4 dark:bg-slate-950/50">
        <iframe
          title={`Email preview: ${template.label}`}
          className="mx-auto block w-full max-w-[680px] min-h-[720px] rounded-lg border border-border bg-white shadow-xl"
          srcDoc={srcDoc}
        />
      </div>
    </div>
  );
}

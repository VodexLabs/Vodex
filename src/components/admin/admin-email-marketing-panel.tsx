"use client";

import * as React from "react";
import { toast } from "@/lib/toast";
import { MARKETING_EMAIL_TEMPLATES } from "@/lib/email/marketing-email-templates";
import { cn } from "@/lib/utils";

type TargetPlan = "all_opted_in" | "free" | "starter" | "pro" | "infinity";
type Tab = "templates" | "automations" | "send" | "test" | "history";

type CampaignRow = {
  id: string;
  template_id: string;
  subject: string;
  target_scope: string;
  recipient_count: number;
  sent_at: string;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "templates", label: "Templates" },
  { id: "automations", label: "Automations" },
  { id: "send", label: "Send campaign" },
  { id: "test", label: "Test email" },
  { id: "history", label: "Sent history" },
];

export function AdminEmailMarketingPanel() {
  const [tab, setTab] = React.useState<Tab>("send");
  const [templateId, setTemplateId] = React.useState<(typeof MARKETING_EMAIL_TEMPLATES)[number]["id"]>("welcome");
  const [targetPlan, setTargetPlan] = React.useState<TargetPlan>("all_opted_in");
  const [targetEmail, setTargetEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [history, setHistory] = React.useState<CampaignRow[]>([]);

  const template = MARKETING_EMAIL_TEMPLATES.find((t) => t.id === templateId)!;

  React.useEffect(() => {
    if (tab !== "history") return;
    void fetch("/api/admin/email-marketing/history", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { campaigns?: CampaignRow[] } | null) => setHistory(j?.campaigns ?? []))
      .catch(() => undefined);
  }, [tab]);

  async function send(testOnly: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/email-marketing/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          templateId,
          targetPlan: targetEmail.trim() ? undefined : targetPlan,
          targetEmail: targetEmail.trim() || undefined,
          testOnly,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Send failed");
      toast.success(
        testOnly
          ? `Test email attempted (${json.sent}/${json.attempted})`
          : `Campaign sent to ${json.sent} recipient(s)`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4" data-testid="admin-email-marketing">
      <h3 className="text-[14px] font-semibold">Email marketing (Resend)</h3>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Premium HTML campaigns. Only users with marketing opt-in receive bulk sends. Uses RESEND_API_KEY and EMAIL_FROM.
      </p>

      <div className="mt-4 flex gap-1 overflow-x-auto rounded-lg bg-muted/40 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-[11px] font-semibold transition",
              tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "templates" && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
          <div className="space-y-2">
            {MARKETING_EMAIL_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateId(t.id)}
                className={cn(
                  "block w-full rounded-xl border px-4 py-3 text-left transition",
                  templateId === t.id
                    ? "border-accent/40 bg-accent/[0.06]"
                    : "border-border bg-background/60 hover:border-accent/30",
                )}
              >
                <p className="text-[13px] font-semibold text-foreground">{t.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{t.subject}</p>
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Full email preview (680px)
            </p>
            <div className="max-h-[min(72vh,720px)] overflow-y-auto rounded-lg bg-[#e8eef5] p-4">
              <iframe
                title="Email preview"
                className="mx-auto block w-full max-w-[680px] min-h-[640px] rounded-lg border border-border bg-white shadow-lg"
                srcDoc={template.buildHtml({
                  appUrl: typeof window !== "undefined" ? window.location.origin : "https://vodex.dev",
                  unsubscribeUrl: "/settings/account",
                })}
              />
            </div>
          </div>
        </div>
      )}

      {tab === "automations" && (
        <div className="mt-4 space-y-2 text-[12px] text-muted-foreground">
          <p className="font-medium text-foreground">Credit-low automations (server-side)</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Build Credits — 80% and 100% (once per billing cycle)</li>
            <li>Action Credits — 80% and 100% (once per billing cycle)</li>
          </ul>
          <p>Triggers after successful credit charges. Sends in-app notification + marketing email when opted in.</p>
        </div>
      )}

      {(tab === "send" || tab === "test") && (
        <div className="mt-4 space-y-3">
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value as typeof templateId)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px]"
          >
            {MARKETING_EMAIL_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          {tab === "send" ? (
            <select
              value={targetPlan}
              onChange={(e) => setTargetPlan(e.target.value as TargetPlan)}
              disabled={Boolean(targetEmail.trim())}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] disabled:opacity-50"
            >
              <option value="all_opted_in">All marketing opt-in</option>
              <option value="free">Free (opted in)</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="infinity">Infinity (all tiers)</option>
            </select>
          ) : null}
          <input
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            placeholder={tab === "test" ? "Test recipient email (required)" : "Specific email (optional)"}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px]"
          />
          <div className="max-h-[280px] overflow-auto rounded-lg border border-dashed border-border bg-background/50 p-3">
            <p className="text-[11px] font-semibold text-foreground">{template.subject}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{template.preheader}</p>
            <iframe
              title="Email preview"
              className="mt-2 h-[200px] w-full rounded border border-border bg-white"
              srcDoc={template.buildHtml({
                appUrl: "https://vodex.dev",
                unsubscribeUrl: "https://vodex.dev/settings/notifications",
                name: "Alex",
              })}
              sandbox=""
            />
          </div>
          <button
            type="button"
            disabled={busy || (tab === "test" && !targetEmail.trim())}
            onClick={() => void send(tab === "test")}
            className="rounded-lg bg-accent px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            {tab === "test" ? "Send test email" : "Send campaign"}
          </button>
        </div>
      )}

      {tab === "history" && (
        <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
          {history.length === 0 ? (
            <li className="px-4 py-6 text-center text-[12px] text-muted-foreground">No campaigns sent yet</li>
          ) : (
            history.map((c) => (
              <li key={c.id} className="px-4 py-3 text-[12px]">
                <p className="font-medium text-foreground">{c.subject}</p>
                <p className="text-muted-foreground">
                  {c.template_id} · {c.recipient_count} recipients · {new Date(c.sent_at).toLocaleString()}
                </p>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

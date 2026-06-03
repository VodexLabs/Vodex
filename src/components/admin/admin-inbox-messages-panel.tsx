"use client";

import * as React from "react";
import { toast } from "@/lib/toast";
import { INBOX_MESSAGE_TEMPLATES } from "@/lib/notifications/inbox-message-templates";
import {
  DEFAULT_INBOX_DESIGN,
  type MessageDesign,
} from "@/lib/control-center/message-design-presets";
import { MessageDesignFields } from "@/components/control-center/message-design-fields";
import { InboxNotificationPreview } from "@/components/control-center/inbox-notification-preview";
import { sanitizeAdminUrl } from "@/lib/control-center/sanitize-url";

type TargetPlan = "all" | "free" | "starter" | "pro" | "infinity";

export function AdminInboxMessagesPanel() {
  const [templateId, setTemplateId] = React.useState(INBOX_MESSAGE_TEMPLATES[0]!.id);
  const [title, setTitle] = React.useState(INBOX_MESSAGE_TEMPLATES[0]!.title);
  const [message, setMessage] = React.useState(INBOX_MESSAGE_TEMPLATES[0]!.body);
  const [design, setDesign] = React.useState<MessageDesign>(DEFAULT_INBOX_DESIGN);
  const [targetEmail, setTargetEmail] = React.useState("");
  const [targetPlan, setTargetPlan] = React.useState<TargetPlan>("all");
  const [actionUrl, setActionUrl] = React.useState("/");
  const [playSound, setPlaySound] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const applyTemplate = React.useCallback((id: string) => {
    const t = INBOX_MESSAGE_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setTitle(t.title);
    setMessage(t.body);
    const iconMap: Record<string, MessageDesign["iconPreset"]> = {
      sparkles: "welcome_sparkle",
      megaphone: "megaphone",
      rocket: "rocket",
      gift: "gift",
      alert: "warning_triangle",
      wrench: "wrench_status",
      users: "workspace_users",
      plug: "integration_plug",
      bell: "megaphone",
    };
    setDesign({
      ...DEFAULT_INBOX_DESIGN,
      iconPreset: iconMap[t.iconKey] ?? DEFAULT_INBOX_DESIGN.iconPreset,
      effectPreset:
        t.effectKey === "stars"
          ? "subtle_stars"
          : t.effectKey === "frost"
            ? "frost_particles"
            : "glow_pulse",
    });
  }, []);

  React.useEffect(() => {
    applyTemplate(templateId);
  }, [templateId, applyTemplate]);

  async function send() {
    setBusy(true);
    try {
      const safeUrl = sanitizeAdminUrl(actionUrl);
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          targetEmail: targetEmail.trim() || undefined,
          targetPlan: targetEmail.trim() ? undefined : targetPlan,
          actionUrl: safeUrl ?? undefined,
          templateId,
          iconKey: design.iconPreset,
          effectKey: design.effectPreset,
          playSound,
          category: "system",
          design,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Send failed");
      toast.success(`Inbox message sent to ${json.recipientCount} user(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4" data-testid="admin-inbox-messages">
      <h3 className="text-[14px] font-semibold">User inbox messages</h3>
      <p className="mt-1 text-[12px] text-muted-foreground">
        In-app notification bell only — not email. Preview matches the real popover card height.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_minmax(280px,360px)]">
        <div className="space-y-3">
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px]"
          >
            {INBOX_MESSAGE_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={targetPlan}
            onChange={(e) => setTargetPlan(e.target.value as TargetPlan)}
            disabled={Boolean(targetEmail.trim())}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] disabled:opacity-50"
          >
            <option value="all">All users</option>
            <option value="free">Free plan</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="infinity">Infinity (all tiers)</option>
          </select>
          <input
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            placeholder="Specific email (overrides plan)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px]"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px]"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px]"
          />
          <input
            value={actionUrl}
            onChange={(e) => setActionUrl(e.target.value)}
            placeholder="Action URL (optional)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px]"
          />
          <MessageDesignFields
            design={design}
            onChange={setDesign}
            onReset={() => applyTemplate(templateId)}
          />
          <label className="flex items-center gap-2 text-[12px]">
            <input type="checkbox" checked={playSound} onChange={(e) => setPlaySound(e.target.checked)} />
            Play in-web sound (if user enabled sounds)
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void send()}
            className="rounded-lg bg-accent px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-50"
            data-testid="admin-send-inbox-message"
          >
            {busy ? "Sending…" : "Send inbox message"}
          </button>
        </div>
        <InboxNotificationPreview title={title} message={message} design={design} />
      </div>
    </div>
  );
}

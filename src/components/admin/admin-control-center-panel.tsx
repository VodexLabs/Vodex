"use client";

import * as React from "react";
import { toast } from "@/lib/toast";
import { AdminSystemStatusPanel } from "@/components/admin/admin-system-status-panel";
import { BANNER_TEMPLATES } from "@/lib/status/announcement-templates";

const NOTIF_TEMPLATES = [
  {
    id: "discord",
    label: "New Discord community",
    title: "Join the Vodex community",
    message:
      "Our new Discord community is live. Join builders, share launches, and follow product updates.",
    actionLabel: "Join Discord",
    actionUrl: "https://discord.gg/y8EbeMc9Mb",
  },
  {
    id: "sale",
    label: "Big sale",
    title: "Limited-time Vodex upgrade offer",
    message:
      "Upgrade now to unlock more build credits, action credits, and premium generation features.",
    actionLabel: "View plans",
    actionUrl: "/pricing",
  },
  {
    id: "system",
    label: "System issue",
    title: "Technical issue affecting Vodex",
    message: "We're aware of an issue affecting some services and are working to resolve it.",
    actionLabel: "Status Page",
    actionUrl: "https://status.vodex.dev",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    title: "Scheduled maintenance",
    message: "Vodex is undergoing scheduled maintenance. Some features may be temporarily unavailable.",
    actionLabel: "View status",
    actionUrl: "https://status.vodex.dev",
  },
  {
    id: "feature",
    label: "New feature",
    title: "New Vodex improvements are live",
    message:
      "We've shipped improvements to app generation, publishing, and workspace collaboration.",
    actionLabel: "See changelog",
    actionUrl: "/changelog",
  },
] as const;

export function AdminControlCenterPanel() {
  const [nTitle, setNTitle] = React.useState("");
  const [nMessage, setNMessage] = React.useState("");
  const [nActionLabel, setNActionLabel] = React.useState("");
  const [nActionUrl, setNActionUrl] = React.useState("");
  const [nEmail, setNEmail] = React.useState("");
  const [nTemplate, setNTemplate] = React.useState<string>(NOTIF_TEMPLATES[0]!.id);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const t = NOTIF_TEMPLATES.find((x) => x.id === nTemplate);
    if (!t) return;
    setNTitle(t.title);
    setNMessage(t.message);
    setNActionLabel(t.actionLabel);
    setNActionUrl(t.actionUrl);
  }, [nTemplate]);

  async function sendBroadcast() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: nTitle.trim(),
          message: nMessage.trim(),
          actionLabel: nActionLabel.trim() || undefined,
          actionUrl: nActionUrl.trim() || undefined,
          targetEmail: nEmail.trim() || undefined,
          category: "system",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Send failed");
      toast.success(`Sent to ${json.recipientCount} user(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-10" data-testid="admin-control-center">
      <div>
        <h2 className="text-[16px] font-semibold">Control Center</h2>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Platform banners, status page, and user notifications. Max 2 active banners visible.
        </p>
      </div>

      <AdminSystemStatusPanel />

      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-[14px] font-semibold">Broadcast notification</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Sends to all existing users (or one email). New signups only get the automatic welcome
          notification.
        </p>
        <div className="mt-4 space-y-3">
          <select
            value={nTemplate}
            onChange={(e) => setNTemplate(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px]"
          >
            {NOTIF_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            value={nEmail}
            onChange={(e) => setNEmail(e.target.value)}
            placeholder="Target email (optional — blank = all users)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px]"
          />
          <input
            value={nTitle}
            onChange={(e) => setNTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px]"
          />
          <textarea
            value={nMessage}
            onChange={(e) => setNMessage(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px]"
          />
          <div className="rounded-lg border border-dashed border-border bg-background/50 p-3">
            <p className="text-[11px] font-semibold text-muted-foreground">Preview</p>
            <p className="mt-1 text-[13px] font-semibold">{nTitle || "Title"}</p>
            <p className="text-[12px] text-muted-foreground">{nMessage || "Message"}</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void sendBroadcast()}
            className="rounded-lg bg-accent px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            Send notification
          </button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Banner templates: {BANNER_TEMPLATES.map((t) => t.label).join(", ")}
      </p>
    </div>
  );
}

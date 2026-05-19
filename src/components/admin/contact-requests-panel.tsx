"use client";

import * as React from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { selectCls } from "@/components/settings/shared";

export type ContactRequestRow = {
  id: string;
  created_at: string;
  user_id: string | null;
  name: string;
  email: string;
  company: string | null;
  reason: string | null;
  kind: string | null;
  plan_interest: string | null;
  message: string;
  status: string;
  source: string;
};

export function ContactRequestsPanel() {
  const [requests, setRequests] = React.useState<ContactRequestRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [reasonFilter, setReasonFilter] = React.useState("all");
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (reasonFilter !== "all") params.set("reason", reasonFilter);
    const qs = params.toString();
    const res = await fetch(`/api/admin/contact-requests${qs ? `?${qs}` : ""}`, { credentials: "include" });
    const json = (await res.json()) as { requests?: ContactRequestRow[] };
    if (res.ok) setRequests(json.requests ?? []);
    setLoading(false);
  }, [statusFilter, reasonFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: "new" | "read" | "resolved") {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/contact-requests", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) await load();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={cn(selectCls, "text-[12px]")}
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="read">Read</option>
          <option value="resolved">Resolved</option>
        </select>
        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          className={cn(selectCls, "text-[12px]")}
        >
          <option value="all">All reasons</option>
          <option value="Sales">Sales</option>
          <option value="Support">Support</option>
          <option value="Billing">Billing</option>
          <option value="Partnership">Partnership</option>
          <option value="Product feedback">Product feedback</option>
          <option value="Other">Other</option>
        </select>
        <Button variant="ghost" size="sm" onClick={() => void load()} className="text-[11px]">
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <Mail className="mb-2 size-8 text-muted-foreground/30" strokeWidth={1.25} />
          <p className="text-[13px] text-muted-foreground">No contact requests match these filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((c) => (
            <article
              key={c.id}
              className="rounded-[var(--radius-lg)] bg-surface px-4 py-3 ring-1 ring-border"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                  c.status === "new" && "bg-accent/15 text-accent",
                  c.status === "read" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                  c.status === "resolved" && "bg-positive/15 text-positive",
                )}
              >
                {c.status}
              </span>
              </div>
              <p className="mt-2 text-[12.5px] font-medium text-foreground">
                {c.name} · <span className="text-muted-foreground">{c.email}</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {c.reason ?? c.kind ?? "—"}
                {c.company ? ` · ${c.company}` : ""}
                {c.plan_interest ? ` · Plan: ${c.plan_interest}` : ""}
                {" · "}
                {c.source}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-foreground/90">{c.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["new", "read", "resolved"] as const).map((s) => (
                  <Button
                    key={s}
                    variant={c.status === s ? "accent" : "ghost"}
                    size="sm"
                    className="h-7 text-[10px] capitalize"
                    disabled={updatingId === c.id || c.status === s}
                    onClick={() => void setStatus(c.id, s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

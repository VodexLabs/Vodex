"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

type Row = {
  project_id: string;
  provider: string;
  status: string;
  mode: string;
  last_verified_at: string | null;
  last_error: string | null;
};

export function AdminAppPaymentsPanel() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/payment-connectors", { credentials: "include" });
        const data = await res.json();
        setRows(data.connections ?? []);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading app payment connectors…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-[14px] font-semibold">Generated app payment connectors</h3>
      <p className="mt-1 text-[12px] text-muted-foreground">
        Redacted configs only — raw secrets are never shown.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="text-muted-foreground">
              <th className="pb-2 pr-3">Project</th>
              <th className="pb-2 pr-3">Provider</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2 pr-3">Mode</th>
              <th className="pb-2">Last verified</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-muted-foreground">
                  No connections yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={`${r.project_id}-${r.provider}`} className="border-t border-border/60">
                  <td className="py-2 pr-3 font-mono text-[11px]">{r.project_id.slice(0, 8)}…</td>
                  <td className="py-2 pr-3">{r.provider}</td>
                  <td className="py-2 pr-3">{r.status}</td>
                  <td className="py-2 pr-3">{r.mode}</td>
                  <td className="py-2">{r.last_verified_at ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

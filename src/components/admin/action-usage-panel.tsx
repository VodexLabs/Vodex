"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

type UsageLog = {
  id: string;
  created_at: string;
  owner_user_id: string;
  project_id: string | null;
  action_type: string;
  provider: string | null;
  provider_cost_usd: number | null;
  action_credits_charged: number;
  status: string;
};

export function ActionUsagePanel() {
  const [logs, setLogs] = React.useState<UsageLog[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void fetch("/api/admin/action-usage", { credentials: "include" })
      .then((r) => r.json())
      .then((j: { logs?: UsageLog[] }) => {
        setLogs(j.logs ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted-foreground">
        Runtime Action Credits usage — provider cost visible to platform admin only. Target margin: 5× provider cost.
      </p>
      {logs.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No runtime actions logged yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl ring-1 ring-border">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-surface text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Action credits</th>
                <th className="px-3 py-2">Provider USD</th>
                <th className="px-3 py-2">Project</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-border">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{log.action_type}</td>
                  <td className="px-3 py-2">{log.provider ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{log.action_credits_charged}</td>
                  <td className="px-3 py-2 tabular-nums">{log.provider_cost_usd ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-[10px]">{log.project_id?.slice(0, 8) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { Loader2, Smartphone } from "lucide-react";

type Job = {
  id: string;
  project_name?: string;
  owner_email?: string;
  platform: string;
  wrapper_type: string;
  status: string;
  artifact_type?: string;
  action_credits_charged?: number;
  provider_cost_usd?: number;
  margin?: number | null;
  error_message?: string | null;
  created_at?: string;
};

export function AdminMobileBuildsPanel() {
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void fetch("/api/admin/mobile-builds", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { jobs: [] }))
      .then((j: { jobs?: Job[] }) => setJobs(j.jobs ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading mobile builds…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Smartphone className="size-4 text-accent" />
        <h2 className="text-[14px] font-semibold text-foreground">Mobile builds</h2>
      </div>
      <p className="text-[12px] text-muted-foreground">
        Provider cost and margin are admin-only. Users see Action Credits only.
      </p>
      <div className="overflow-x-auto rounded-xl ring-1 ring-border">
        <table className="w-full min-w-[720px] text-left text-[11px]">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Project</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Platform</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Action CR</th>
              <th className="px-3 py-2">Provider $</th>
              <th className="px-3 py-2">Margin</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                  No mobile build jobs yet
                </td>
              </tr>
            ) : (
              jobs.map((j) => (
                <tr key={j.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{j.project_name ?? "—"}</td>
                  <td className="px-3 py-2">{j.owner_email ?? "—"}</td>
                  <td className="px-3 py-2 capitalize">
                    {j.platform} · {j.wrapper_type}
                  </td>
                  <td className="px-3 py-2 capitalize">{j.status.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2">{j.action_credits_charged ?? 0}</td>
                  <td className="px-3 py-2">{j.provider_cost_usd != null ? Number(j.provider_cost_usd).toFixed(4) : "—"}</td>
                  <td className="px-3 py-2">{j.margin != null ? `${j.margin.toFixed(1)}×` : "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {j.created_at ? new Date(j.created_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

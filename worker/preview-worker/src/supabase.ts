import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

export const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type PreviewBuildJobRow = {
  id: string;
  project_id: string;
  owner_id: string;
  status: string;
  framework: string | null;
  source_snapshot_path: string | null;
  artifact_path: string | null;
  runtime_mode: string | null;
  blocked_reason: string | null;
  diagnostics: Record<string, unknown>;
  build_logs: string | null;
  logs: string | null;
};

export async function claimNextJob(): Promise<PreviewBuildJobRow | null> {
  const { data, error } = await supabase.rpc("claim_preview_build_job", {
    p_worker_id: config.workerId,
    p_stale_lock_minutes: 30,
  });
  if (error) {
    throw new Error(`claim_preview_build_job: ${error.message}`);
  }
  if (!data || (Array.isArray(data) && data.length === 0)) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) return null;
  return row as PreviewBuildJobRow;
}

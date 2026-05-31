import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { DreamosLogRow } from "@/lib/diagnostics/dreamos-logger";
import { sanitizeDiagnosticMetadata } from "@/lib/diagnostics/truncate-large-diagnostic-string";

type LooseDb = {
  from: (table: string) => {
    insert: (rows: unknown) => Promise<{ error: { message: string } | null }>;
  };
};

export async function persistDiagnosticLogs(entries: DreamosLogRow[]): Promise<{
  stored: boolean;
  tableMissing: boolean;
  error?: string;
}> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return { stored: false, tableMissing: false, error: "service_role_unavailable" };
  }

  const rows = entries.map((e) => ({
    severity: e.severity,
    source: e.source,
    category: e.category,
    route: e.route,
    component: e.component,
    action: e.action,
    message: e.message,
    user_id: e.userId,
    project_id: e.projectId,
    conversation_id: e.conversationId,
    build_id: e.buildId,
    metadata: sanitizeDiagnosticMetadata(e.metadata ?? {}),
  }));

  const db = admin as unknown as LooseDb;
  const { error } = await db.from("dreamos_diagnostic_logs").insert(rows);
  if (!error) return { stored: true, tableMissing: false };

  const msg = error.message ?? "";
  if (msg.includes("dreamos_diagnostic_logs") || msg.includes("does not exist")) {
    return { stored: false, tableMissing: true, error: msg };
  }
  return { stored: false, tableMissing: false, error: msg };
}

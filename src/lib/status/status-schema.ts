import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isStatusSchemaMissingError } from "@/lib/status/status-db";

const CORE_TABLES = ["status_components", "platform_announcements"] as const;
const OPTIONAL_TABLES = ["status_daily_history", "status_incidents"] as const;

async function probeTable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  table: string,
  columns: string,
): Promise<{ ok: boolean; missing: boolean }> {
  const { error } = await db.from(table).select(columns).limit(1);
  if (!error) return { ok: true, missing: false };
  if (isStatusSchemaMissingError(error)) return { ok: false, missing: true };
  return { ok: true, missing: false };
}

/**
 * True when service role can read core status/announcement tables (minimal probe).
 * Optional history/incident tables may be absent without blocking admin UI.
 */
export async function checkStatusSchemaReady(options?: { bustCache?: boolean }): Promise<boolean> {
  const admin = createServiceRoleClient();
  if (!admin) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  if (options?.bustCache) {
    await db.from("status_components").select("id").limit(1).maybeSingle();
  }

  for (const table of CORE_TABLES) {
    const probe = await probeTable(db, table, "id");
    if (!probe.ok && probe.missing) return false;
  }

  for (const table of OPTIONAL_TABLES) {
    await probeTable(db, table, "id");
  }

  return true;
}

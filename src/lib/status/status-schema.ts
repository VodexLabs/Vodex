import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isStatusSchemaMissingError } from "@/lib/status/status-db";

const REQUIRED_TABLES = [
  "status_components",
  "status_daily_history",
  "status_incidents",
  "platform_announcements",
] as const;

/**
 * True when service role can read core status/announcement tables (minimal probe).
 */
export async function checkStatusSchemaReady(): Promise<boolean> {
  const admin = createServiceRoleClient();
  if (!admin) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  for (const table of REQUIRED_TABLES) {
    const { error } = await db.from(table).select("id").limit(1);
    if (error) {
      if (isStatusSchemaMissingError(error)) return false;
      // Transient / empty errors on some tables should not block if components exist
      if (table === "status_components") return false;
    }
  }
  return true;
}

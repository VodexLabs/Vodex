/** Supabase/PostgREST errors when status tables are missing from schema cache. */
export function isStatusSchemaMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; details?: string; hint?: string };
  const msg = `${e.message ?? ""} ${e.details ?? ""} ${e.hint ?? ""}`.toLowerCase();
  return (
    e.code === "PGRST205" ||
    e.code === "PGRST204" ||
    e.code === "42P01" ||
    e.code === "42703" ||
    msg.includes("schema cache") ||
    msg.includes("platform_announcements") ||
    msg.includes("status_components") ||
    msg.includes("status_daily_history") ||
    msg.includes("status_incidents") ||
    msg.includes("could not find the table") ||
    msg.includes("could not find the column") ||
    (msg.includes("column") && msg.includes("does not exist"))
  );
}

export const STATUS_SCHEMA_INSTALL_HINT =
  "Apply migrations 20260720120000_platform_status.sql, 20260721120000_platform_status_p16.sql, 20260722120000_p17_production_stability.sql, 20260728120000_p21_control_center_comms.sql, and 20260730120000_p23_control_center_visuals_and_status_fix.sql in Supabase SQL Editor, then run: NOTIFY pgrst, 'reload schema';";

export function uptimePercentForStatus(status: string): number {
  switch (status) {
    case "operational":
      return 100;
    case "maintenance":
      return 92;
    case "degraded":
      return 96;
    case "partial_outage":
      return 85;
    case "major_outage":
      return 55;
    default:
      return 100;
  }
}

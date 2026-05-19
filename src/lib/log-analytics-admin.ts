import type { SupabaseClient } from "@supabase/supabase-js";

/** Insert analytics row as service role (bypasses user RLS). Best-effort for callers — logs never break uploads. */
export async function logAnalyticsAdmin(
  admin: SupabaseClient,
  row: {
    user_id: string;
    event_type: string;
    properties?: Record<string, unknown>;
  },
) {
  const { error } = await admin.from("analytics_events").insert({
    user_id: row.user_id,
    event_type: row.event_type,
    properties: row.properties ?? {},
  });
  if (error && process.env.NODE_ENV !== "production") {
    console.warn("[logAnalyticsAdmin]", error.message);
  }
}

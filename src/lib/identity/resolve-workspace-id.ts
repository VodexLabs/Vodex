import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Primary workspace for an account — first workspace by created_at, else profiles.id fallback.
 */
export async function resolveWorkspaceIdForUser(
  supabase: SupabaseClient,
  accountId: string,
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", accountId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return data.id;
  } catch {
    /* workspaces table may be missing in partial schemas */
  }
  return accountId;
}

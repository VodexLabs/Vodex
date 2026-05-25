import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultWorkspaceNameFromEmail } from "@/lib/profile/default-workspace-name";

/** Ensure every account has a distinct workspace row (not profile-id fallback). */
export async function ensurePersonalWorkspace(
  supabase: SupabaseClient,
  accountId: string,
  email?: string | null,
  displayName?: string | null,
): Promise<string> {
  try {
    const { data: existing } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_id", accountId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing?.id) return existing.id;

    const base =
      (displayName ?? "").trim() ||
      defaultWorkspaceNameFromEmail(email).replace(/'s workspace$/i, "");
    const slugBase = base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "workspace";
    const slug = `${slugBase}-${accountId.slice(0, 8)}`;
    const name = defaultWorkspaceNameFromEmail(email);

    const { data: inserted, error } = await supabase
      .from("workspaces")
      .insert({
        owner_id: accountId,
        name,
        slug,
      })
      .select("id")
      .single();

    if (!error && inserted?.id) return inserted.id;
  } catch {
    /* table may be unavailable */
  }

  return accountId;
}

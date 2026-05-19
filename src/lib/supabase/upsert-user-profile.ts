import type { SupabaseAdminClient } from "./admin";
import type { Database, Profile } from "./types";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

/**
 * Insert-or-update the current user's profile row via service role.
 * Only sends `id`, `email`, and fields from `patch` so DB defaults apply for everything else.
 */
export async function upsertUserProfile(
  admin: SupabaseAdminClient,
  userId: string,
  email: string,
  patch: ProfileUpdate,
): Promise<{ data: Profile | null; error: { message: string; code?: string } | null }> {
  const safeEmail = email.trim() || "user@users.local";
  const row = { id: userId, email: safeEmail, ...patch };
  const { data, error } = await admin
    .from("profiles")
    .upsert(row as Database["public"]["Tables"]["profiles"]["Insert"], { onConflict: "id" })
    .select()
    .single();
  if (error) {
    return { data: null, error: { message: error.message, code: error.code } };
  }
  return { data: data as Profile, error: null };
}

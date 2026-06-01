import type { SupabaseClient } from "@supabase/supabase-js";

/** Returns true when the user must finish onboarding before using the app shell. */
export async function userNeedsOnboarding(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", userId)
    .maybeSingle();
  return data?.onboarding_completed !== true;
}

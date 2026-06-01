import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveOnboardingCompleteForUser } from "@/lib/onboarding/onboarding-status";

/** Returns true when the user must finish onboarding before using the app shell. */
export async function userNeedsOnboarding(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const complete = await resolveOnboardingCompleteForUser(userId, supabase);
  return !complete;
}

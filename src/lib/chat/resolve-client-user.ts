"use client";

import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/types";

/** Resolves the signed-in user id from Zustand or a live Supabase session. */
export async function resolveClientUserId(
  supabase: SupabaseClient,
  user: User | null | undefined,
  profile: Profile | null | undefined,
): Promise<string | null> {
  if (user?.id) return user.id;
  if (profile?.id) return profile.id;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

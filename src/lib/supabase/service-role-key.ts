/** Server-only Supabase service role key (never import from client components). */
export function getSupabaseServiceRoleKey(): string | undefined {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  const trimmed = key?.trim();
  return trimmed || undefined;
}

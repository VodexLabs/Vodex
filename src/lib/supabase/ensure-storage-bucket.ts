import type { SupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Ensure a public storage bucket exists (service role). Idempotent.
 */
export async function ensurePublicBucket(
  admin: SupabaseAdminClient,
  bucketId: string,
): Promise<{ ok: true } | { ok: false; error: string; hint?: string }> {
  const { data: buckets, error: listErr } = await admin.storage.listBuckets();
  if (listErr) {
    return {
      ok: false,
      error: listErr.message,
      hint: "Check SUPABASE_SECRET_KEY and Storage permissions for the service role.",
    };
  }
  if (buckets?.some((b: { id: string }) => b.id === bucketId)) {
    return { ok: true };
  }

  const { error: createErr } = await admin.storage.createBucket(bucketId, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
  });

  if (createErr) {
    return {
      ok: false,
      error: createErr.message,
      hint: `Create a public Storage bucket named "${bucketId}" in the Supabase dashboard (Storage → New bucket → public).`,
    };
  }

  return { ok: true };
}

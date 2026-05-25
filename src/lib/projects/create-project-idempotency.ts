import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Writer = SupabaseClient<Database>;

const IDEMPOTENCY_TTL_MS = 30 * 60_000;
const META_KEY = "create_idempotency_key";

export function buildCreateIdempotencyKey(
  userId: string,
  requestId: string,
  activeDraftId?: string | null,
): string {
  const draft = activeDraftId?.trim() || "none";
  const req = requestId.trim() || "none";
  return `${userId}:${draft}:${req}`;
}

export async function findProjectByCreateIdempotency(
  writer: Writer,
  userId: string,
  idempotencyKey: string,
): Promise<{ id: string; slug: string | null } | null> {
  const key = idempotencyKey.trim();
  if (!key) return null;

  const since = new Date(Date.now() - IDEMPOTENCY_TTL_MS).toISOString();
  const { data, error } = await writer
    .from("projects")
    .select("id, slug, metadata, created_at")
    .eq("owner_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error || !data?.length) return null;

  for (const row of data) {
    const meta =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {};
    if (meta[META_KEY] === key) {
      return { id: row.id, slug: row.slug ?? null };
    }
  }
  return null;
}

export function idempotencyMetadataPatch(idempotencyKey: string): Record<string, unknown> {
  return { [META_KEY]: idempotencyKey.trim() };
}

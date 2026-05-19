import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const DOMAIN = "dreamos86.com";

export function publicWebUrlForSubdomain(sub: string): string {
  return `https://${sub}.${DOMAIN}`;
}

export function slugifyPublicSubdomain(raw: string): string {
  let s = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  if (!s || s.length < 2) s = "app";
  return s;
}

/**
 * Allocate a unique `published_subdomain` for a project (collision-safe).
 */
export async function allocatePublishedSubdomain(
  db: SupabaseClient<Database>,
  projectId: string,
  ownerId: string,
): Promise<string | null> {
  const { data: row, error: selErr } = await db
    .from("projects")
    .select("slug, name, published_subdomain")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (selErr || !row) return null;

  const existing = row.published_subdomain?.trim();
  if (existing) return existing;

  let base = slugifyPublicSubdomain(row.slug || row.name || "app");

  for (let i = 0; i < 80; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const { data: clash } = await db
      .from("projects")
      .select("id")
      .eq("published_subdomain", candidate)
      .neq("id", projectId)
      .maybeSingle();

    if (!clash) {
      const { error: upErr } = await db
        .from("projects")
        .update({ published_subdomain: candidate } as never)
        .eq("id", projectId)
        .eq("owner_id", ownerId);

      if (upErr) return null;
      return candidate;
    }
  }

  return null;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { buildPublicUrl } from "@/lib/publish/public-url";
import { PLATFORM_BASE_DOMAIN } from "@/lib/publish/publish-config";
import { allocatePublishSubdomain, sanitizePublishSlug } from "@/lib/publish/subdomain-allocator";

export { PLATFORM_BASE_DOMAIN, sanitizePublishSlug };

/** Honest public URL — subdomain only when DNS verified; otherwise /p/slug. */
export function publicWebUrlForSubdomain(sub: string): string {
  return buildPublicUrl(sub).url;
}

export function slugifyPublicSubdomain(raw: string): string {
  return sanitizePublishSlug(raw || "app") || "app";
}

/** @deprecated Use allocatePublishSubdomain — kept for chat route compatibility. */
export async function allocatePublishedSubdomain(
  db: SupabaseClient<Database>,
  projectId: string,
  ownerId: string,
): Promise<string | null> {
  const result = await allocatePublishSubdomain(db, { projectId, ownerId });
  return result.ok ? result.slug : null;
}

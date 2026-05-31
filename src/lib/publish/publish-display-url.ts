import { readLifecycleFromMetadata } from "@/lib/projects/project-lifecycle";
import { buildPublicUrl } from "@/lib/publish/public-url";
import { wildcardSubdomainEnabled } from "@/lib/publish/publish-config";
import { publicWebUrlForSubdomain } from "@/lib/publish/subdomain";

/** Resolve the user-visible published URL without pulling publish pipeline modules. */
export function resolveDisplayPublicUrl(project: {
  published_subdomain?: string | null;
  metadata?: unknown;
}): string | null {
  const meta = readLifecycleFromMetadata(project.metadata);
  if (meta.public_url && meta.lifecycle_status === "published") return meta.public_url;
  const sub = project.published_subdomain?.trim();
  if (!sub) return null;
  if (wildcardSubdomainEnabled()) return publicWebUrlForSubdomain(sub);
  return buildPublicUrl(sub).url;
}

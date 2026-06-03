import { buildInitialsIconSvg } from "@/lib/projects/build-initials-icon-svg";

/** True when stored SVG would render pale/transparent on cards. */
export function isWeakIconSvg(svg: string | null | undefined): boolean {
  if (!svg?.trim()) return true;
  if (!svg.includes("<svg")) return true;
  const lower = svg.toLowerCase();
  if (lower.includes('opacity="0') || lower.includes("opacity:0")) return true;
  const hasSolidRect =
    /<rect[^>]+fill=(?!["']none["'])/i.test(svg) ||
    /fill="url\(#/i.test(svg) ||
    /<rect[^>]+fill:\s*(?!none)/i.test(svg);
  const hasSolidCircle = /<circle[^>]+fill=(?!["']none["'])/i.test(svg);
  const hasSolidPath = /<path[^>]+fill=(?!["']none["'])/i.test(svg);
  if (!hasSolidRect && !hasSolidCircle && !hasSolidPath) return true;
  return false;
}

function isRemoteOrStoredIconUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  return (
    u.startsWith("http://") ||
    u.startsWith("https://") ||
    u.startsWith("/") ||
    u.startsWith("blob:")
  );
}

/** Deterministic icon — never returns weak/transparent SVG. */
export function ensureProjectIconSvg(title: string, stored?: string | null): string {
  const name = title.trim() || "App";
  if (stored?.trim() && !isWeakIconSvg(stored)) return stored.trim();
  return buildInitialsIconSvg(name);
}

export function projectIconSrc(
  projectId: string,
  iconSvg?: string | null,
  iconUrl?: string | null,
  cacheKey?: string | null,
): string {
  const key = cacheKey?.trim();
  const bust = key ? `?v=${encodeURIComponent(key)}` : "";
  const storedUrl = iconUrl?.trim();
  if (storedUrl && isRemoteOrStoredIconUrl(storedUrl)) {
    if (storedUrl.startsWith("data:")) return storedUrl;
    if (!key) return storedUrl;
    const sep = storedUrl.includes("?") ? "&" : "?";
    return `${storedUrl}${sep}v=${encodeURIComponent(key)}`;
  }
  if (iconSvg?.trim() && !isWeakIconSvg(iconSvg)) {
    return `data:image/svg+xml,${encodeURIComponent(iconSvg.trim())}`;
  }
  const fallback = `/api/projects/${projectId}/icon`;
  return bust ? `${fallback}${bust}` : fallback;
}

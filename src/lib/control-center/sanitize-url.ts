/** Allow only safe http(s) and relative app paths for admin links. */
export function sanitizeAdminUrl(raw: string | undefined | null): string | null {
  const t = raw?.trim();
  if (!t) return null;
  if (t.startsWith("/") && !t.startsWith("//")) {
    if (t.includes("javascript:") || t.includes("data:")) return null;
    return t;
  }
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function escapeHtmlText(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

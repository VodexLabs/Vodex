/** Track last visited routes for command palette suggestions (deduped, max 6). */

export type RecentPageEntry = {
  id: string;
  label: string;
  href: string;
  category: string;
  breadcrumb: string;
  visitedAt: number;
};

const STORAGE_KEY = "dreamos-recent-pages";
const MAX_RECENT = 6;

function readAll(): RecentPageEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentPageEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: RecentPageEntry[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_RECENT)));
  } catch {
    /* quota */
  }
}

export function recordRecentPage(entry: Omit<RecentPageEntry, "visitedAt">): void {
  const now = Date.now();
  const without = readAll().filter((e) => e.href !== entry.href);
  writeAll([{ ...entry, visitedAt: now }, ...without].slice(0, MAX_RECENT));
}

export function getRecentPages(limit = MAX_RECENT): RecentPageEntry[] {
  return readAll().slice(0, limit);
}

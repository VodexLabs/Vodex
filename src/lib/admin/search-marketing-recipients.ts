import { createServiceRoleClient } from "@/lib/supabase/admin";

export type MarketingRecipientSearchResult = {
  id: string;
  email: string;
  displayName: string;
};

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

function matchesQuery(
  row: { email: string; display_name?: string | null; full_name?: string | null },
  q: string,
): { match: boolean; startsWith: boolean } {
  const email = row.email.toLowerCase();
  const name = (row.display_name ?? row.full_name ?? "").toLowerCase();
  const startsWith = email.startsWith(q) || name.startsWith(q);
  const contains = startsWith || email.includes(q) || name.includes(q);
  return { match: contains, startsWith };
}

/** Max 10 users — display name or email, starts-with preferred. */
export async function searchMarketingRecipients(
  query: string,
  limit = 10,
): Promise<{ results: MarketingRecipientSearchResult[]; error?: string }> {
  const q = normalizeQuery(query);
  if (q.length < 2) return { results: [] };

  const admin = createServiceRoleClient();
  if (!admin) return { results: [], error: "Service role unavailable" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const cap = Math.min(Math.max(limit, 1), 10);

  const { data: emailRows, error: emailErr } = await db
    .from("profiles")
    .select("id, email, display_name, full_name")
    .ilike("email", `${q}%`)
    .limit(cap);

  const { data: nameRows, error: nameErr } = await db
    .from("profiles")
    .select("id, email, display_name, full_name")
    .or(`display_name.ilike.${q}%,full_name.ilike.${q}%`)
    .limit(cap);

  if (emailErr && nameErr) {
    return { results: [], error: emailErr.message ?? nameErr.message };
  }

  const merged = new Map<string, MarketingRecipientSearchResult & { startsWith: boolean }>();

  for (const row of [...(emailRows ?? []), ...(nameRows ?? [])]) {
    if (!row?.id || !row?.email) continue;
    const { match, startsWith } = matchesQuery(row, q);
    if (!match) continue;
    const displayName =
      (typeof row.display_name === "string" && row.display_name) ||
      (typeof row.full_name === "string" && row.full_name) ||
      row.email.split("@")[0] ||
      "User";
    const prev = merged.get(row.id);
    if (!prev || (startsWith && !prev.startsWith)) {
      merged.set(row.id, {
        id: row.id,
        email: row.email,
        displayName,
        startsWith,
      });
    }
  }

  if (merged.size < cap) {
    const containsQueries = [
      db.from("profiles").select("id, email, display_name, full_name").ilike("email", `%${q}%`).limit(cap * 2),
      db
        .from("profiles")
        .select("id, email, display_name, full_name")
        .ilike("display_name", `%${q}%`)
        .limit(cap * 2),
    ];
    const containsResults = await Promise.all(containsQueries);
    for (const { data: containsRows } of containsResults) {
      for (const row of containsRows ?? []) {
        if (!row?.id || !row?.email || merged.has(row.id)) continue;
        const { match, startsWith } = matchesQuery(row, q);
        if (!match) continue;
        const displayName =
          (typeof row.display_name === "string" && row.display_name) ||
          (typeof row.full_name === "string" && row.full_name) ||
          row.email.split("@")[0] ||
          "User";
        merged.set(row.id, {
          id: row.id,
          email: row.email,
          displayName,
          startsWith,
        });
        if (merged.size >= cap) break;
      }
      if (merged.size >= cap) break;
    }
  }

  const results = [...merged.values()]
    .sort((a, b) => {
      if (a.startsWith !== b.startsWith) return a.startsWith ? -1 : 1;
      return a.email.localeCompare(b.email);
    })
    .slice(0, cap)
    .map(({ id, email, displayName }) => ({ id, email, displayName }));

  return { results };
}

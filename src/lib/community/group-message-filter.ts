/** Basic blocked terms for group chat (18+ / explicit). Expand via admin later. */

const BLOCKED_TERMS = [
  "porn",
  "xxx",
  "nsfw",
  "onlyfans",
  "nude",
  "nudes",
  "hentai",
  "sex tape",
  "blowjob",
  "cumshot",
];

export function filterGroupMessageBody(body: string): { ok: true } | { ok: false; reason: string } {
  const normalized = body.toLowerCase().replace(/\s+/g, " ");
  for (const term of BLOCKED_TERMS) {
    if (normalized.includes(term)) {
      return { ok: false, reason: "Message blocked — explicit content is not allowed in group chat." };
    }
  }
  return { ok: true };
}

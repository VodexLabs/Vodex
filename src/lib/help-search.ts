import { DOCS, type DocArticle } from "@/lib/docs";

export type HelpSearchHit = {
  slug: string;
  title: string;
  description: string;
  category: string;
  score: number;
  snippet?: string;
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function articleSearchBlob(doc: DocArticle): string {
  return normalize(
    [doc.title, doc.description, doc.category, ...(doc.keywords ?? []), doc.content].join(" "),
  );
}

export function searchHelpArticles(query: string, limit = 12): HelpSearchHit[] {
  const q = normalize(query);
  if (!q) return [];

  const terms = q.split(" ").filter(Boolean);
  const hits: HelpSearchHit[] = [];

  for (const doc of DOCS) {
    const blob = articleSearchBlob(doc);
    let score = 0;
    for (const term of terms) {
      if (normalize(doc.title).includes(term)) score += 8;
      if (normalize(doc.description).includes(term)) score += 4;
      if ((doc.keywords ?? []).some((k) => normalize(k).includes(term))) score += 6;
      if (blob.includes(term)) score += 2;
    }
    if (score <= 0) continue;
    hits.push({
      slug: doc.slug,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      score,
    });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function getAllHelpArticleLinks(): Array<{ title: string; href: string; category: string }> {
  return DOCS.map((d) => ({
    title: d.title,
    href: `/help/docs/${d.slug}`,
    category: d.category,
  }));
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock, ArrowRight } from "lucide-react";
import { getDoc, getDocsByCategory } from "@/lib/docs";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const { DOCS } = await import("@/lib/docs");
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) return {};
  return {
    title: `${doc.title} Help`,
    description: doc.description,
  };
}

/** Very lightweight markdown → HTML (no external dep needed) */
function renderMarkdown(md: string): string {
  return md
    // Fenced code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="my-4 overflow-x-auto rounded-lg bg-muted/60 p-4 text-[12.5px] font-mono ring-1 ring-border"><code class="language-${lang}">${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="rounded bg-muted/60 px-1.5 py-0.5 text-[12px] font-mono ring-1 ring-border/50">$1</code>')
    // H2
    .replace(/^## (.+)$/gm, '<h2 class="mt-8 mb-3 text-[18px] font-semibold tracking-[-0.03em] text-foreground first:mt-0">$1</h2>')
    // H3
    .replace(/^### (.+)$/gm, '<h3 class="mt-6 mb-2 text-[15px] font-semibold text-foreground">$1</h3>')
    // Tables (simple)
    .replace(/^\|(.+)\|$/gm, (row) => {
      const cells = row.split("|").slice(1, -1).map((c) => c.trim());
      return `<tr>${cells.map((c) => `<td class="border border-border px-3 py-2 text-[13px]">${c}</td>`).join("")}</tr>`;
    })
    // Wrap table rows
    .replace(/(<tr>[\s\S]*?<\/tr>)/g, (block) =>
      `<div class="my-4 overflow-x-auto rounded-lg ring-1 ring-border"><table class="w-full border-collapse">${block}</table></div>`)
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-5 list-decimal text-[14px] text-muted-foreground">$1</li>')
    // Unordered list items
    .replace(/^[-*] (.+)$/gm, '<li class="ml-5 list-disc text-[14px] text-muted-foreground">$1</li>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote class="my-3 border-l-2 border-accent/40 pl-4 text-[13px] italic text-muted-foreground">$1</blockquote>')
    // Paragraphs (double newline)
    .replace(/\n\n(?!<)/g, '</p><p class="mt-3 text-[14px] leading-relaxed text-muted-foreground">')
    // Wrap in paragraph
    .replace(/^([^<\n].+)$/gm, (line) =>
      line.startsWith("<") ? line : `<p class="mt-3 text-[14px] leading-relaxed text-muted-foreground">${line}</p>`)
    // Inline links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-accent hover:underline underline-offset-4">$1</a>');
}

export default async function HelpDocPage({ params }: Props) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  const byCategory = getDocsByCategory();
  const html = renderMarkdown(doc.content);

  return (
    <div className="mx-auto max-w-5xl pb-20">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-[12px] text-muted-foreground">
        <Link href="/help" className="hover:text-foreground transition flex items-center gap-1">
          <ChevronLeft className="size-3" />
          Help Center
        </Link>
        <span>/</span>
        <span className="text-foreground">{doc.title}</span>
      </div>

      <div className="flex gap-10">
        {/* Main content */}
        <main className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent ring-1 ring-accent/20">
              {doc.category}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-3" strokeWidth={1.75} />
              {doc.readMinutes} min read
            </span>
          </div>
          <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.05em] text-foreground">
            {doc.title}
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">{doc.description}</p>

          <div
            className="mt-8 [&>*:first-child]:mt-0"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </main>

        {/* Sidebar nav */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-6 space-y-5">
            {Object.entries(byCategory).map(([cat, docs]) => (
              <div key={cat}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  {cat}
                </p>
                <div className="space-y-1">
                  {docs.map((d) => (
                    <Link
                      key={d.slug}
                      href={`/help/docs/${d.slug}`}
                      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] transition ${
                        d.slug === slug
                          ? "bg-surface text-foreground font-medium ring-1 ring-border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d.slug === slug && <ArrowRight className="size-3 shrink-0 text-accent" strokeWidth={2} />}
                      {d.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

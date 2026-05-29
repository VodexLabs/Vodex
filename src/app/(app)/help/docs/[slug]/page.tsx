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

import { renderHelpMarkdown } from "@/lib/help-markdown";
import { HelpDocBody } from "@/components/help/help-doc-body";

export default async function HelpDocPage({ params }: Props) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  const byCategory = getDocsByCategory();
  const html = renderHelpMarkdown(doc.content);

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

          <HelpDocBody html={html} />
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

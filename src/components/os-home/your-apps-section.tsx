"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, LayoutGrid, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type YourAppsProject = {
  id: string;
  name: string;
  gradient: string;
  status: string;
  updated_at: string;
  preview_url: string | null;
  icon_url?: string | null;
};

function AppPreview({ previewUrl, gradient }: { previewUrl: string | null; gradient: string }) {
  if (previewUrl) {
    return (
      <div className="relative h-[108px] w-full overflow-hidden bg-muted/20">
        <iframe
          src={previewUrl}
          title=""
          tabIndex={-1}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
          className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[200%] max-w-none -translate-x-1/2 origin-top scale-[0.22] border-0 opacity-95"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-background/75"
          aria-hidden
        />
      </div>
    );
  }

  return <div className={cn("h-[108px] w-full bg-gradient-to-br opacity-90", gradient)} aria-hidden />;
}

function AppIcon({ project }: { project: YourAppsProject }) {
  if (project.icon_url) {
    return (
      <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-background ring-1 ring-border/70">
        <Image
          src={project.icon_url}
          alt=""
          width={36}
          height={36}
          className="size-full object-cover"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "size-9 shrink-0 rounded-lg bg-gradient-to-br shadow-inner ring-1 ring-white/25",
        project.gradient,
      )}
    />
  );
}

export function YourAppsSection({ projects }: { projects: YourAppsProject[] }) {
  const hasApps = projects.length > 0;

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-3.5 text-accent" strokeWidth={1.75} />
          <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Your apps
          </span>
        </div>
        {hasApps ? (
          <Link
            href="/projects"
            className="flex items-center gap-1 text-[11.5px] font-medium text-accent transition hover:underline"
          >
            View all
            <ArrowRight className="size-3" strokeWidth={2} />
          </Link>
        ) : null}
      </div>

      {hasApps ? (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {projects.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={`/apps/${p.id}/builder`}
                className="group flex w-[220px] flex-col overflow-hidden rounded-xl bg-surface ring-1 ring-border transition hover:ring-accent/35 hover:shadow-md"
              >
                <AppPreview previewUrl={p.preview_url} gradient={p.gradient} />
                <div className="flex items-center gap-2.5 p-3">
                  <AppIcon project={p} />
                  <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
                    {p.name}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
          <Link
            href="/create"
            className="flex w-[140px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-6 transition hover:border-accent/40 hover:bg-accent/5"
          >
            <Plus className="size-5 text-accent" strokeWidth={2} />
            <span className="text-[11.5px] font-medium text-muted-foreground">New app</span>
          </Link>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-surface/40 px-6 py-10 text-center"
        >
          <p className="text-[14px] font-semibold text-foreground">No apps yet</p>
          <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
            Describe what you want above — your first app will show up here.
          </p>
          <Link
            href="/create"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-accent/90"
          >
            Start building
            <ArrowRight className="size-3.5" strokeWidth={2} />
          </Link>
        </motion.div>
      )}
    </section>
  );
}

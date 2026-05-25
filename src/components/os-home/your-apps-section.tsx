"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, LayoutGrid, Plus, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectIcon } from "@/components/projects/project-icon";
import { ProjectBanner } from "@/components/projects/project-banner";
import {
  getProjectCardStatus,
  getUserSafeProjectBadges,
  isImportedAppWithoutPreview,
  type ProjectCardInput,
} from "@/lib/projects/user-safe-project-badges";
import { projectIconSrc } from "@/lib/projects/ensure-project-icon";

export type YourAppsProject = ProjectCardInput & {
  name: string;
  gradient: string;
  updated_at: string;
  icon_url?: string | null;
  icon_svg?: string | null;
  banner_svg?: string | null;
  is_favorite?: boolean | null;
};

export function YourAppsSection({ projects }: { projects: YourAppsProject[] }) {
  const hasApps = projects.length > 0;

  return (
    <section className="w-full" data-testid="your-apps-section">
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
          {projects.slice(0, 12).map((p, i) => {
            const status = getProjectCardStatus(p);
            const badges = getUserSafeProjectBadges(p, { mode: "user" });
            const iconSrc = projectIconSrc(p.id, p.icon_svg, p.icon_url);
            const importedPending = isImportedAppWithoutPreview(p);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={`/apps/${p.id}/builder`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl bg-surface ring-1 ring-border/70 transition hover:ring-accent/30"
                >
                  <ProjectBanner
                    projectId={p.id}
                    bannerSvg={p.banner_svg}
                    previewUrl={p.preview_url}
                    title={p.name}
                    heightClass="h-[108px]"
                    previewOnly={!p.preview_url}
                    importedPendingSetup={importedPending}
                    iconSrc={iconSrc}
                  />
                  <div className="border-t border-border/50 bg-surface/95">
                    <div className="flex items-start gap-2.5 p-3">
                      <ProjectIcon
                        projectId={p.id}
                        iconSvg={p.icon_svg}
                        iconUrl={p.icon_url}
                        size={36}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <p className="truncate text-[13px] font-semibold text-foreground">{p.name}</p>
                          <div className="flex shrink-0 items-center gap-1">
                            {p.is_favorite && (
                              <Star className="size-3 fill-amber-400 text-amber-400" strokeWidth={1.75} aria-label="Favorite" />
                            )}
                            <span className={cn("text-[9px] font-medium", status.text)}>
                              {status.label}
                            </span>
                          </div>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                          {typeof p.metadata?.short_description === "string"
                            ? p.metadata.short_description
                            : "Your app on DreamOS86"}
                        </p>
                        {badges.some((b) => b.kind === "meta") && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {badges
                              .filter((b) => b.kind === "meta")
                              .map((b) => (
                                <span
                                  key={b.label}
                                  className="rounded-full bg-muted/80 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
                                >
                                  {b.label}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
          {projects.length < 12 ? (
          <Link
            href="/create"
            className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/80 px-4 py-6 transition hover:border-accent/40 hover:bg-accent/5"
          >
            <Plus className="size-5 text-accent" strokeWidth={2} />
            <span className="text-[11.5px] font-medium text-muted-foreground">New app</span>
          </Link>
          ) : null}
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

"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Loader2, Eye, Rocket, Lock } from "lucide-react";
import Link from "next/link";
import { PublishTemplateModal } from "@/components/templates/publish-template-modal";
import { isPaidPlan } from "@/lib/billing/plan-features";
import { cn } from "@/lib/utils";
import { fetchDedupe } from "@/lib/cache/fetch-dedupe";

const CATEGORIES = ["SaaS", "Mobile", "AI", "Commerce", "Community", "Productivity", "Other"] as const;

type PageOption = { id: string; label: string; path: string };

function routeLabel(path: string): string {
  const m = path.match(/\/(page|pages)\/([^/]+)/i) || path.match(/([^/]+)\/page\.(tsx|jsx)$/i);
  if (m) return m[2] ?? m[1] ?? path;
  if (/page\.(tsx|jsx|html)$/i.test(path)) return "Home";
  return path.split("/").pop() ?? path;
}

export function AppTemplateSettingsPanel({
  projectId,
  planId,
  defaultTitle,
  hasFiles,
}: {
  projectId: string;
  planId?: string | null;
  defaultTitle: string;
  hasFiles: boolean;
}) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [visibility, setVisibility] = React.useState<"public" | "private" | "unlisted">("public");
  const [category, setCategory] = React.useState<string>(CATEGORIES[0]);
  const [description, setDescription] = React.useState("");
  const [pages, setPages] = React.useState<PageOption[]>([]);
  const [selectedPage, setSelectedPage] = React.useState<string>("");
  const [loadingPages, setLoadingPages] = React.useState(true);
  const canPublish = isPaidPlan(planId ?? "free") && hasFiles;

  React.useEffect(() => {
    void fetchDedupe(`template-pages:${projectId}`, (signal) =>
      fetch(`/api/projects/${projectId}/files`, { credentials: "include", signal }).then((r) => r.json()),
    )
      .then((json) => {
        const files = (json as { files?: Array<{ path: string }> }).files ?? [];
        const routes = files
          .map((f) => f.path)
          .filter((p) => /\/(page|pages)\//i.test(p) || /page\.(tsx|jsx|html)$/i.test(p))
          .slice(0, 24)
          .map((path, i) => ({ id: `p-${i}`, label: routeLabel(path), path }));
        setPages(routes.length ? routes : [{ id: "home", label: "Home", path: "page.tsx" }]);
        setSelectedPage(routes[0]?.id ?? "home");
      })
      .catch(() => setPages([{ id: "home", label: "Home", path: "page.tsx" }]))
      .finally(() => setLoadingPages(false));
  }, [projectId]);

  const activePage = pages.find((p) => p.id === selectedPage) ?? pages[0];

  return (
    <div className="space-y-5" data-testid="app-template-settings">
      <div>
        <h2 className="text-[18px] font-semibold text-foreground">App Template</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Choose a preview page and publish exactly how builders will see your template card.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl bg-surface p-4 ring-1 ring-border/70">
          <p className="text-[12px] font-semibold text-foreground">Template preview source</p>
          {loadingPages ? (
            <div className="h-10 animate-pulse rounded-xl bg-muted/40" />
          ) : (
            <select
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              className="w-full rounded-xl bg-background px-3 py-2.5 text-[13px] ring-1 ring-border"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} — {p.path}
                </option>
              ))}
            </select>
          )}

          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Visibility</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["public", "private", "unlisted"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={cn(
                    "rounded-xl px-3 py-2 text-[12px] font-semibold capitalize ring-1",
                    visibility === v ? "bg-accent text-white ring-accent" : "bg-background ring-border text-muted-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-xl bg-background px-3 py-2.5 text-[13px] ring-1 ring-border"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full resize-none rounded-xl bg-background px-3 py-2.5 text-[13px] ring-1 ring-border"
              placeholder="What builders get when they clone this template"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={!canPublish}
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              <Rocket className="size-4" />
              Publish template
            </button>
            <Link
              href={`/apps/${projectId}/builder?tab=preview`}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-semibold ring-1 ring-border"
            >
              <Eye className="size-4" />
              Open builder preview
            </Link>
          </div>

          {!canPublish ? (
            <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5 text-[11px] text-amber-900 ring-1 ring-amber-500/20">
              <Lock className="mt-0.5 size-4 shrink-0" />
              Paid plan with generated files required to publish community templates.
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="text-[12px] font-semibold text-foreground">Template card preview</p>
          <motion.div
            key={activePage?.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="overflow-hidden rounded-2xl bg-surface ring-1 ring-border shadow-lg"
          >
            <div className="aspect-[16/10] bg-gradient-to-br from-muted/50 to-background">
              <iframe
                title="Template preview"
                src={`/api/projects/${projectId}/preview-html`}
                className="size-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
            <div className="border-t border-border p-4">
              <p className="text-[15px] font-semibold text-foreground">{defaultTitle}</p>
              <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">
                {description || "Add a description to help builders understand this template."}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">{category}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                  {visibility}
                </span>
                {activePage ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Preview: {activePage.label}
                  </span>
                ) : null}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <PublishTemplateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        projectId={projectId}
        defaultTitle={defaultTitle}
        initialDescription={description}
        initialCategory={category}
        initialVisibility={visibility}
      />
    </div>
  );
}

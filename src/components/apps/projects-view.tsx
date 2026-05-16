"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Plus, Search, Star, LayoutGrid, List,
  Sparkles, Loader2, ArrowUpRight, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";  
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { variants } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Project } from "@/lib/supabase/types";
import { ZipImportWizard } from "@/components/apps/zip-import-wizard";

const STATUS_CONFIG: Record<Project["status"], { label: string; dot: string; text: string }> = {
  live: { label: "Live", dot: "bg-positive animate-pulse", text: "text-positive" },
  staging: { label: "Staging", dot: "bg-amber-400", text: "text-amber-400" },
  draft: { label: "Draft", dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
  building: { label: "Building", dot: "bg-accent animate-pulse", text: "text-accent" },
  error: { label: "Error", dot: "bg-destructive", text: "text-destructive" },
};

function ProjectCard({ project }: { project: Project }) {
  const cfg = STATUS_CONFIG[project.status];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] bg-surface ring-1 ring-border transition hover:ring-accent/30 hover:shadow-lg cursor-pointer"
    >
      {/* Gradient header */}
      <div className={cn("h-24 w-full bg-gradient-to-br", project.gradient, "opacity-80")} />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold tracking-tight text-foreground">
              {project.name}
            </p>
            {project.description && (
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{project.description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-background px-2 py-0.5">
            <span className={cn("size-1.5 rounded-full", cfg.dot)} />
            <span className={cn("text-[10px] font-medium", cfg.text)}>{cfg.label}</span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>{project.framework}</span>
            <span>{new Date(project.updated_at).toLocaleDateString()}</span>
          </div>
          <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
            {project.preview_url && (
              <a
                href={project.preview_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-background hover:text-foreground"
              >
                <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
              </a>
            )}
            <button className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition hover:bg-background hover:text-amber-400">
              <Star className={cn("size-3.5", project.is_favorite && "fill-amber-400 text-amber-400")} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ProjectsView() {
  const supabase = createClient();
  const { profile } = useAuthStore();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [showImport, setShowImport] = React.useState(false);

  React.useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from("projects")
      .select("*")
      .eq("owner_id", profile.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        setProjects((data as Project[]) ?? []);
        setLoading(false);
      });
  }, [profile?.id]);

  const filtered = projects.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <motion.div
      variants={variants.staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-5 pb-10"
    >
      {/* Header */}
      <motion.div variants={variants.fadeUp} className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="h-9 w-full rounded-[var(--radius-lg)] bg-surface pl-9 pr-3 text-[13px] text-foreground ring-1 ring-border outline-none focus:ring-accent/40"
          />
        </div>

        <div className="flex rounded-lg ring-1 ring-border">
          {(["grid", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "flex items-center justify-center p-2 transition first:rounded-l-lg last:rounded-r-lg",
                view === v ? "bg-surface text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "grid" ? <LayoutGrid className="size-4" strokeWidth={1.75} /> : <List className="size-4" strokeWidth={1.75} />}
            </button>
          ))}
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5"
          onClick={() => setShowImport(true)}
        >
          <Upload className="size-3.5" strokeWidth={1.75} />
          Import ZIP
        </Button>
        <Button variant="accent" size="sm" className="gap-1.5">
          <Plus className="size-3.5" strokeWidth={2} />
          New project
        </Button>
      </motion.div>

      {/* ZIP import wizard */}
      {showImport && (
        <ZipImportWizard
          onClose={() => setShowImport(false)}
          onComplete={(name) => {
            setShowImport(false);
            // In production: navigate to the newly created project workspace
            console.info("ZIP import complete:", name);
          }}
        />
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="size-8 text-muted-foreground/30" strokeWidth={1.25} />}
          title={search ? "No matching projects" : "No projects yet"}
          description={search ? "Try a different search term" : "Create your first project to get started"}
          action={
            !search
              ? { label: "Create project" }
              : undefined
          }
        />
      ) : (
        <div className={cn(
          view === "grid"
            ? "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : "space-y-2",
        )}>
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

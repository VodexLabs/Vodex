"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentWorkflowEvent } from "@/lib/build/workflow-stream-types";

export type WorkflowSectionId =
  | "product_plan"
  | "routes"
  | "data_model"
  | "components"
  | "pages"
  | "quality"
  | "preview";

const SECTIONS: Array<{
  id: WorkflowSectionId;
  label: string;
  match: (ev: AgentWorkflowEvent) => boolean;
}> = [
  { id: "product_plan", label: "Product plan", match: (e) => /plan|understanding|archetype|brief/i.test(e.title) },
  { id: "routes", label: "Routes", match: (e) => /route|navigation|screen/i.test(e.title) },
  { id: "data_model", label: "Data model", match: (e) => /schema|mock data|data model/i.test(e.title) },
  { id: "components", label: "Components", match: (e) => /component/i.test(e.title) || /components\//i.test(e.filePath ?? "") },
  { id: "pages", label: "Pages", match: (e) => /page\.tsx|writing|created app\//i.test(`${e.filePath ?? ""} ${e.title}`) },
  { id: "quality", label: "Quality checks", match: (e) => /validat|checking|quality|interface/i.test(e.title) },
  { id: "preview", label: "Preview", match: (e) => /preview/i.test(e.title) },
];

function statusForSection(
  id: WorkflowSectionId,
  events: AgentWorkflowEvent[],
  working: boolean,
): "pending" | "active" | "done" {
  const section = SECTIONS.find((s) => s.id === id)!;
  const matched = events.filter(section.match);
  if (matched.some((e) => e.status === "active")) return working ? "active" : "done";
  if (matched.some((e) => e.status === "done")) return "done";
  if (working && id === "product_plan" && events.length > 0) return "active";
  return "pending";
}

export function BuildWorkflowSections({
  events,
  working,
  ephemeralLine,
  className,
}: {
  events: AgentWorkflowEvent[];
  working: boolean;
  ephemeralLine?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState<Record<string, boolean>>({});

  return (
    <section className={cn("mr-6 space-y-2 sm:mr-10", className)} data-testid="build-workflow-sections">
      {ephemeralLine ? (
        <p
          className="px-0.5 text-[11px] font-medium text-sky-600/90 dark:text-sky-300/80"
          data-testid="ephemeral-action-line"
        >
          {ephemeralLine}
        </p>
      ) : null}
      <div className="space-y-1.5">
        {SECTIONS.map((section) => {
          const st = statusForSection(section.id, events, working);
          const detail = events.filter(section.match).slice(-1)[0]?.subtitle ?? events.filter(section.match).slice(-1)[0]?.title;
          return (
            <div
              key={section.id}
              className={cn(
                "overflow-visible rounded-xl border px-3 py-2 transition",
                st === "active" && "border-amber-400/60 bg-amber-50/30 ring-2 ring-amber-400/40 dark:bg-amber-950/15",
                st === "done" && "border-emerald-500/35 bg-emerald-50/25 dark:bg-emerald-950/10",
                st === "pending" && "border-border/60 bg-surface/40",
              )}
              data-testid={`workflow-section-${section.id}`}
              data-section-status={st}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 text-left"
                onClick={() => setOpen((s) => ({ ...s, [section.id]: !s[section.id] }))}
              >
                {st === "done" ? (
                  <Check className="size-3.5 shrink-0 text-emerald-600" />
                ) : st === "active" ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-amber-600" />
                ) : (
                  <span className="size-3.5 shrink-0 rounded-full border border-border" />
                )}
                <span className="min-w-0 flex-1 text-[12px] font-semibold text-foreground">{section.label}</span>
                <ChevronDown className={cn("size-3.5 text-muted-foreground transition", open[section.id] && "rotate-180")} />
              </button>
              {detail && (open[section.id] || st === "active") ? (
                <p className="mt-1 pl-5 text-[10.5px] text-muted-foreground">{detail}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function groupFileEventsByPurpose(events: AgentWorkflowEvent[]): Array<{
  id: string;
  label: string;
  events: AgentWorkflowEvent[];
}> {
  const buckets: Record<string, AgentWorkflowEvent[]> = {
    shell: [],
    pages: [],
    components: [],
    data: [],
    styles: [],
    config: [],
  };
  for (const ev of events) {
    const p = (ev.filePath ?? "").replace(/\\/g, "/").toLowerCase();
    if (!p) continue;
    if (/package\.json|tsconfig|capacitor|next\.config/.test(p)) buckets.config.push(ev);
    else if (/globals\.css|\.css$|tailwind/.test(p)) buckets.styles.push(ev);
    else if (/mock-data|lib\/.*data|schema/.test(p)) buckets.data.push(ev);
    else if (/components\//.test(p)) buckets.components.push(ev);
    else if (/app\/.*page\.(tsx|jsx)/.test(p) || p === "app/page.tsx") buckets.pages.push(ev);
    else buckets.shell.push(ev);
  }
  return [
    { id: "shell", label: "App shell", events: buckets.shell },
    { id: "pages", label: "Pages", events: buckets.pages },
    { id: "components", label: "Components", events: buckets.components },
    { id: "data", label: "Data", events: buckets.data },
    { id: "styles", label: "Styles", events: buckets.styles },
    { id: "config", label: "Config", events: buckets.config },
  ].filter((g) => g.events.length > 0);
}

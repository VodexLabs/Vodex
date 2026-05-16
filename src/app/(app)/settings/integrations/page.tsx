"use client";

import * as React from "react";
import { integrations } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Check,
  Plus,
  Lock,
  GitBranch,
  Database,
  Pen,
  Zap,
  Box,
  BookOpen,
  LineChart,
  Cloud,
  Mail,
  Globe,
} from "lucide-react";

const categoryFilters = [
  "All",
  "Version Control",
  "Deployment",
  "Database",
  "Payments",
  "Design",
  "Communication",
  "Project Management",
  "Knowledge",
  "Email",
];

function IntegrationIcon({ logo, size = 20 }: { logo: string; size?: number }) {
  const cls = "shrink-0 text-muted-foreground";
  const props = {
    style: { width: size, height: size },
    strokeWidth: 1.6 as number,
    className: cls,
  };
  switch (logo) {
    case "github":
      return <GitBranch {...props} />;
    case "supabase":
      return <Database {...props} />;
    case "figma":
      return <Pen {...props} />;
    case "stripe":
      return <Zap {...props} />;
    case "vercel":
      return <Box {...props} />;
    case "slack":
      return <Globe {...props} />;
    case "linear":
      return <LineChart {...props} />;
    case "notion":
      return <BookOpen {...props} />;
    case "cloudflare":
      return <Cloud {...props} />;
    case "resend":
      return <Mail {...props} />;
    default:
      return <Globe {...props} />;
  }
}

export default function IntegrationsSettingsPage() {
  const [connected, setConnected] = React.useState<Record<string, boolean>>(
    Object.fromEntries(integrations.map((i) => [i.id, i.connected])),
  );
  const [filter, setFilter] = React.useState("All");

  const filtered =
    filter === "All"
      ? integrations
      : integrations.filter((i) => i.category === filter);

  const connectedCount = Object.values(connected).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">
          <span className="font-medium text-foreground">{connectedCount}</span>{" "}
          of {integrations.length} integrations connected
        </p>
      </div>

      {/* Category filter */}
      <div className="overflow-x-auto -mx-[var(--page-padding-x)]">
        <div className="flex gap-1.5 px-[var(--page-padding-x)] min-w-max pb-1">
          {categoryFilters.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[12px] font-medium ring-1 transition-all duration-150 whitespace-nowrap",
                filter === cat
                  ? "bg-foreground/[0.08] ring-border-strong text-foreground"
                  : "ring-border text-muted-foreground hover:text-foreground hover:bg-muted/60",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Integration grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((integration) => {
          const isConnected = connected[integration.id];
          return (
            <div
              key={integration.id}
              className={cn(
                "relative rounded-[var(--radius-xl)] ring-1 shadow-[var(--shadow-card)] overflow-hidden transition-all duration-150",
                isConnected
                  ? "bg-glass backdrop-blur-xl ring-positive/25"
                  : "bg-glass backdrop-blur-xl ring-border hover:ring-border-strong",
              )}
            >
              {/* Coming soon overlay */}
              {integration.comingSoon && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[var(--radius-xl)] bg-background/70 backdrop-blur-sm">
                  <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 ring-1 ring-border shadow-[var(--shadow-sm)]">
                    <Lock
                      className="size-3.5 text-muted-foreground"
                      strokeWidth={1.6}
                    />
                    <span className="text-[12px] font-medium text-muted-foreground">
                      Coming soon
                    </span>
                  </div>
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted ring-1 ring-border shadow-[var(--shadow-xs)]">
                    <IntegrationIcon logo={integration.logo} size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
                        {integration.name}
                      </h3>
                      {isConnected && (
                        <Badge variant="positive" className="text-[10px]">
                          Connected
                        </Badge>
                      )}
                    </div>
                    <Badge variant="neutral" className="mt-1 text-[10px]">
                      {integration.category}
                    </Badge>
                  </div>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
                  {integration.description}
                </p>
                <Button
                  variant={isConnected ? "secondary" : "outline"}
                  size="sm"
                  onClick={() =>
                    !integration.comingSoon &&
                    setConnected((prev) => ({
                      ...prev,
                      [integration.id]: !prev[integration.id],
                    }))
                  }
                  disabled={integration.comingSoon}
                  className={cn(
                    "gap-1.5",
                    isConnected &&
                      "text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30",
                  )}
                >
                  {isConnected ? (
                    <>
                      <Check className="size-3.5" strokeWidth={2} />
                      Disconnect
                    </>
                  ) : (
                    <>
                      <Plus className="size-3.5" strokeWidth={2} />
                      Connect
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="size-12 rounded-full bg-muted ring-1 ring-border flex items-center justify-center mb-4">
            <Globe
              className="size-5 text-muted-foreground"
              strokeWidth={1.6}
            />
          </div>
          <p className="text-[14px] font-medium text-foreground">
            No integrations in this category
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Check back soon — more integrations are coming.
          </p>
        </div>
      )}
    </div>
  );
}

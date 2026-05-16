"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, ExternalLink, Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { integrations } from "@/lib/data";
import { variants } from "@/lib/motion";
import { cn } from "@/lib/utils";

const categoryOrder = ["Version Control", "Deployment", "Database", "Design", "Communication", "Project Management", "Knowledge", "Email"];

// Simple color map for integration logos
const logoColors: Record<string, string> = {
  github: "#1a1a2e",
  vercel: "#000000",
  stripe: "#635bff",
  supabase: "#3ecf8e",
  figma: "#f24e1e",
  slack: "#4a154b",
  linear: "#5e6ad2",
  notion: "#000000",
  cloudflare: "#f6821f",
  resend: "#000000",
};

const logoInitials: Record<string, string> = {
  github: "GH",
  vercel: "VC",
  stripe: "ST",
  supabase: "SB",
  figma: "FG",
  slack: "SL",
  linear: "LN",
  notion: "NT",
  cloudflare: "CF",
  resend: "RS",
};

export function IntegrationsSettings() {
  const [connected, setConnected] = React.useState<Record<string, boolean>>(
    Object.fromEntries(integrations.map((i) => [i.id, i.connected]))
  );
  const [category, setCategory] = React.useState("All");

  const categories = ["All", ...categoryOrder.filter((c) => integrations.some((i) => i.category === c))];

  const filtered = integrations.filter(
    (i) => category === "All" || i.category === category
  );

  return (
    <div className="space-y-6">
      {/* Honest status banner */}
      <motion.div
        variants={variants.fadeUp}
        initial="hidden"
        animate="show"
        className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-surface px-5 py-4"
      >
        <ExternalLink className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <div>
          <p className="text-[13px] font-semibold text-foreground">
            Integrations are in active development
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Connect buttons for available integrations (Supabase, GitHub) will open an OAuth flow.
            Integrations marked <strong>Coming soon</strong> are not yet available.
          </p>
        </div>
      </motion.div>

      <motion.div variants={variants.staggerContainer} initial="hidden" animate="show" className="space-y-5">
        <motion.div variants={variants.staggerItem}>
          {/* Category filter */}
          <div className="flex flex-wrap gap-2 pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-medium transition",
                  category === cat
                    ? "bg-foreground text-background"
                    : "bg-surface text-muted-foreground ring-1 ring-border hover:text-foreground",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div variants={variants.staggerItem}>
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((integration) => {
              const isConnected = connected[integration.id];
              return (
                <div
                  key={integration.id}
                  className={cn(
                    "relative flex items-start gap-4 rounded-[var(--radius-xl)] p-5 transition ring-1",
                    isConnected
                      ? "bg-surface shadow-[var(--shadow-card)] ring-border"
                      : "bg-muted/30 ring-border/60",
                    integration.comingSoon && "opacity-60",
                  )}
                >
                  {/* Logo */}
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[11px] font-bold text-white shadow-[var(--shadow-xs)]"
                    style={{ backgroundColor: logoColors[integration.logo] ?? "#4a5568" }}
                  >
                    {logoInitials[integration.logo] ?? integration.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-foreground">{integration.name}</p>
                      {integration.comingSoon && (
                        <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
                          Soon
                        </span>
                      )}
                      {isConnected && (
                        <span className="flex items-center gap-0.5 rounded-full bg-positive/15 px-1.5 py-0.5 text-[10px] font-semibold text-positive">
                          <Check className="size-2.5" strokeWidth={2.5} />
                          Connected
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                      {integration.category}
                    </span>
                    <p className="mt-1 text-[12px] text-muted-foreground">{integration.description}</p>
                  </div>

                  {!integration.comingSoon && (
                    <Button
                      variant={isConnected ? "secondary" : "accent"}
                      size="xs"
                      className="shrink-0"
                      onClick={() => {
                        if (!isConnected) {
                          // Supabase and GitHub have real OAuth via Supabase Auth
                          if (integration.id === "github") {
                            window.location.href = "/auth/login?provider=github&next=/settings/integrations";
                            return;
                          }
                          if (integration.id === "supabase") {
                            window.location.href = "/help/docs/supabase-setup";
                            return;
                          }
                        }
                        setConnected((p) => ({ ...p, [integration.id]: !isConnected }));
                      }}
                    >
                      {isConnected ? "Disconnect" : "Connect"}
                    </Button>
                  )}
                  {integration.comingSoon && (
                    <span className="rounded-full bg-muted/60 px-2 py-1 text-[10px] font-medium text-muted-foreground ring-1 ring-border">
                      Coming soon
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

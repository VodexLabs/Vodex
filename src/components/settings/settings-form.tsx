"use client";

import { motion } from "framer-motion";
import { KeyRound, SlidersHorizontal, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

function SettingRow({
  title,
  description,
  defaultOn,
}: {
  title: string;
  description: string;
  defaultOn?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-5">
      <div className="min-w-0">
        <p className="text-[13px] font-medium tracking-[-0.01em] text-foreground">
          {title}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch defaultChecked={defaultOn} aria-label={title} />
    </div>
  );
}

export function SettingsForm() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-muted ring-1 ring-border">
                <User className="size-[17px]" strokeWidth={1.55} />
              </span>
              <div className="space-y-1">
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  How you appear to collaborators in this workspace.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[13px]">
              <span className="font-medium text-foreground">Display name</span>
              <Input defaultValue="Alex Chen" className="mt-2" />
            </label>
            <label className="block text-[13px]">
              <span className="font-medium text-foreground">Work email</span>
              <Input type="email" defaultValue="alex@dreamos86.ai" className="mt-2" />
            </label>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-muted ring-1 ring-border">
                <SlidersHorizontal className="size-[17px]" strokeWidth={1.55} />
              </span>
              <div className="space-y-1">
                <CardTitle>Workspace defaults</CardTitle>
                <CardDescription>
                  Safer defaults for new projects and API traffic.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-border pt-0">
            <SettingRow
              title="Require review before production deploys"
              description="A lightweight approval step before traffic shifts."
              defaultOn
            />
            <SettingRow
              title="Temporary DEBUG prompt logging (24h)"
              description="Auto-expires; useful when validating changes."
            />
            <SettingRow
              title="Pause spend when monthly budget is reached"
              description="Prevents surprise invoices without blocking dev work."
              defaultOn
            />
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-muted ring-1 ring-border">
                <KeyRound className="size-[17px]" strokeWidth={1.55} />
              </span>
              <div className="space-y-1">
                <CardTitle>API keys</CardTitle>
                <CardDescription>
                  Rotate regularly. Prefer scoped keys for production.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              readOnly
              value="sk_live_························"
              className="font-mono text-[13px] text-muted-foreground"
            />
            <Button variant="secondary" size="lg" className="sm:w-auto">
              Rotate key
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex justify-end gap-2 pt-2"
      >
        <Button variant="ghost" size="lg">
          Discard
        </Button>
        <Button variant="accent" size="lg">
          Save changes
        </Button>
      </motion.div>
    </div>
  );
}

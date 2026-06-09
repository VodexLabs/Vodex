"use client";

import * as React from "react";
import Link from "next/link";
import {
  Loader2,
  Shield,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { SECRETS_HELPER_PROMPT } from "@/lib/secrets/secrets-helper-prompt";

type EnvReq = { key: string; required?: boolean; provider?: string };

const PROVIDER_FOR_KEY: Record<string, string> = {
  SUPABASE_URL: "Supabase",
  SUPABASE_ANON_KEY: "Supabase",
  SUPABASE_SERVICE_ROLE_KEY: "Supabase",
  NEXT_PUBLIC_SUPABASE_URL: "Supabase",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "Supabase",
  OPENAI_API_KEY: "OpenAI",
  ANTHROPIC_API_KEY: "Anthropic",
  GOOGLE_GENERATIVE_AI_API_KEY: "Google AI",
  STRIPE_SECRET_KEY: "Stripe",
  STRIPE_PUBLISHABLE_KEY: "Stripe",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "Stripe",
  RESEND_API_KEY: "Resend",
  FIREBASE_API_KEY: "Firebase",
  GITHUB_TOKEN: "GitHub",
  GOOGLE_OAUTH_CLIENT_ID: "Google OAuth",
  GOOGLE_OAUTH_CLIENT_SECRET: "Google OAuth",
  DATABASE_URL: "Database",
};

const HOW_TO_GET: Record<string, string> = {
  SUPABASE_URL: "Supabase Dashboard → Project Settings → API → Project URL",
  SUPABASE_ANON_KEY: "Supabase Dashboard → Project Settings → API → anon public key",
  SUPABASE_SERVICE_ROLE_KEY: "Supabase Dashboard → API → service_role (server only)",
  OPENAI_API_KEY: "platform.openai.com → API keys → Create secret key",
  STRIPE_SECRET_KEY: "Stripe Dashboard → Developers → API keys → Secret key",
  RESEND_API_KEY: "resend.com → API Keys",
};

function providerForKey(key: string): string {
  if (PROVIDER_FOR_KEY[key]) return PROVIDER_FOR_KEY[key];
  if (key.includes("SUPABASE")) return "Supabase";
  if (key.includes("STRIPE")) return "Stripe";
  if (key.includes("FIREBASE")) return "Firebase";
  if (key.startsWith("VITE_")) return "Vite env";
  if (key.startsWith("NEXT_PUBLIC_")) return "Public env";
  return "Environment";
}

function reasonForKey(key: string): string {
  if (key.includes("ANON")) return "Client-side auth / public API access";
  if (key.includes("SERVICE_ROLE") || key.includes("SECRET")) return "Server-side only — never expose to browser";
  if (key.includes("STRIPE")) return "Payment processing";
  if (key.includes("SUPABASE")) return "Database and authentication";
  if (key.startsWith("NEXT_PUBLIC_")) return "Bundled into the client app";
  return "Required by your imported app at runtime";
}

function normalizeEnvReqs(raw: unknown): EnvReq[] {
  if (!Array.isArray(raw)) return [];
  const out: EnvReq[] = [];
  for (const item of raw) {
    if (typeof item === "string") out.push({ key: item, required: true });
    else if (item && typeof item === "object" && "key" in item) {
      const o = item as { key?: string; public?: boolean; required?: boolean };
      if (o.key)
        out.push({
          key: o.key,
          required: o.required !== false,
          provider: providerForKey(o.key),
        });
    }
  }
  return out;
}

export function ImportedSecretsSetupPanel({
  projectId,
  envRequirements,
  className,
  variant = "full",
  onSaved,
  onAskAi,
  onClose,
  onSkipOptional,
}: {
  projectId: string;
  envRequirements: unknown;
  className?: string;
  /** compact = in-chat panel; full = dashboard secrets page */
  variant?: "compact" | "full";
  onSaved?: () => void;
  onAskAi?: () => void;
  onClose?: () => void;
  onSkipOptional?: () => void;
}) {
  const compact = variant === "compact";
  const reqs = React.useMemo(() => {
    return normalizeEnvReqs(envRequirements).filter(
      (r) => !/^VITE_BASE44_/i.test(r.key) && !/^BASE44_/i.test(r.key),
    );
  }, [envRequirements]);

  const [configured, setConfigured] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [submittingAll, setSubmittingAll] = React.useState(false);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [expandedGuide, setExpandedGuide] = React.useState<string | null>(null);

  const keysSig = reqs.map((r) => r.key).join(",");

  React.useEffect(() => {
    let cancelled = false;
    void fetch(`/api/projects/${projectId}/secrets`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { keys?: Array<{ name: string }> } | null) => {
        if (!cancelled && j?.keys) setConfigured(new Set(j.keys.map((k) => k.name)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, keysSig]);

  async function saveOne(keyName: string) {
    const value = values[keyName]?.trim();
    if (!value) return;
    setSaving(keyName);
    try {
      const r = await fetch(`/api/projects/${projectId}/secrets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ keyName, value }),
      });
      const j = (await r.json()) as { error?: string; hint?: string };
      if (!r.ok) {
        toast.error(j.hint ? `${j.error} — ${j.hint}` : (j.error ?? "Save failed"));
        return;
      }
      setConfigured((prev) => new Set(prev).add(keyName));
      setValues((v) => ({ ...v, [keyName]: "" }));
      toast.success(`${keyName} saved securely`);
      onSaved?.();
    } finally {
      setSaving(null);
    }
  }

  async function submitAll() {
    const pending = reqs.filter((r) => values[r.key]?.trim());
    if (pending.length === 0) {
      toast.info("Enter values for secrets you want to save.");
      return;
    }
    setSubmittingAll(true);
    try {
      for (const r of pending) {
        await saveOne(r.key);
      }
    } finally {
      setSubmittingAll(false);
    }
  }

  function skipOptional() {
    onSkipOptional?.();
  }

  if (reqs.length === 0) {
    return (
      <div className={cn("rounded-lg bg-emerald-500/8 px-3 py-2 ring-1 ring-emerald-500/20", className)}>
        <p className="text-[11px] font-medium text-foreground">No required secrets detected</p>
      </div>
    );
  }

  const missingCount = reqs.filter((r) => !configured.has(r.key)).length;
  const showAskAi = !compact && missingCount > 0 && onAskAi;

  return (
    <div
      className={cn(compact ? "space-y-2" : "space-y-4", className)}
      data-testid={compact ? "compact-secret-setup-panel" : "imported-secrets-setup-panel"}
    >
      {!compact ? (
        <div className="rounded-xl border border-border/80 bg-surface/60 p-3 ring-1 ring-border/60">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-accent" strokeWidth={1.75} />
            <p className="text-[12px] font-semibold text-foreground">Setup secrets</p>
            {loading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            Values are encrypted server-side. Do not paste secrets into chat.
          </p>
          <p className="mt-1 text-[11px] font-medium text-foreground">
            {missingCount > 0 ? `${missingCount} still needed` : "All configured"}
          </p>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">
          {missingCount > 0 ? `${missingCount} key(s) missing` : "All keys saved"}
          {loading ? " · loading…" : ""}
        </p>
      )}

      <ul className={cn(compact ? "space-y-1.5" : "space-y-3")}>
        {reqs.map((r) => {
          const done = configured.has(r.key);
          const guide = HOW_TO_GET[r.key] ?? `${providerForKey(r.key)} provider dashboard → API / credentials`;
          return (
            <li
              key={r.key}
              className={cn(
                "rounded-lg ring-1 ring-border/50",
                compact ? "bg-background/80 px-2 py-1.5" : "bg-surface/50 p-2.5",
              )}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="font-mono text-[10px] font-semibold text-foreground sm:text-[11px]">{r.key}</p>
                <span
                  className={cn(
                    "rounded px-1 py-0 text-[9px] font-semibold uppercase",
                    r.required !== false
                      ? "bg-amber-500/12 text-amber-800"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {r.required !== false ? "Required" : "Optional"}
                </span>
                {done ? (
                  <CheckCircle2 className="size-3 text-positive" />
                ) : (
                  <AlertCircle className="size-3 text-amber-600" />
                )}
              </div>
              {compact ? (
                <p className="mt-0.5 line-clamp-1 text-[9px] text-muted-foreground">{reasonForKey(r.key)}</p>
              ) : (
                <p className="mt-0.5 text-[10px] text-muted-foreground">{reasonForKey(r.key)}</p>
              )}
              <button
                type="button"
                className="mt-0.5 flex items-center gap-0.5 text-[9px] font-medium text-accent hover:underline"
                onClick={() => setExpandedGuide((k) => (k === r.key ? null : r.key))}
              >
                {expandedGuide === r.key ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
                How to get it
              </button>
              {expandedGuide === r.key ? (
                <p className="mt-0.5 text-[9px] leading-snug text-muted-foreground">{guide}</p>
              ) : null}
              <div className={cn("flex gap-1.5", compact ? "mt-1" : "mt-2")}>
                <input
                  type="password"
                  autoComplete="off"
                  value={values[r.key] ?? ""}
                  placeholder={done ? "••••••••" : "Paste once"}
                  onChange={(e) => setValues((v) => ({ ...v, [r.key]: e.target.value }))}
                  className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-[10px] outline-none focus-visible:ring-1 focus-visible:ring-ring/35"
                />
                <Button
                  type="button"
                  size="xs"
                  variant="accent"
                  className="h-7 shrink-0 px-2 text-[10px]"
                  disabled={saving === r.key || !values[r.key]?.trim()}
                  onClick={() => void saveOne(r.key)}
                >
                  {saving === r.key ? <Loader2 className="size-3 animate-spin" /> : "Save"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-1.5 pt-0.5">
        <Button
          type="button"
          size="xs"
          variant="accent"
          disabled={submittingAll}
          className="h-7 text-[10px]"
          onClick={() => void submitAll()}
        >
          {submittingAll ? <Loader2 className="size-3 animate-spin" /> : "Submit all"}
        </Button>
        {onSkipOptional ? (
          <Button type="button" size="xs" variant="outline" className="h-7 text-[10px]" onClick={skipOptional}>
            Skip optional
          </Button>
        ) : null}
        {onClose ? (
          <Button type="button" size="xs" variant="ghost" className="h-7 text-[10px]" onClick={onClose}>
            Close
          </Button>
        ) : null}
        {showAskAi ? (
          <button
            type="button"
            onClick={onAskAi}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-surface px-2.5 py-1.5 text-[10px] font-semibold text-foreground ring-1 ring-border hover:bg-surface-raised"
          >
            <Sparkles className="size-3 text-accent" />
            Ask AI to help connect secrets
          </button>
        ) : null}
        {!compact && !onAskAi && missingCount > 0 ? (
          <Link
            href={`/apps/${projectId}/builder?mode=discuss&insertPrompt=${encodeURIComponent(SECRETS_HELPER_PROMPT)}`}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-surface px-2.5 py-1.5 text-[10px] font-semibold text-foreground ring-1 ring-border hover:bg-surface-raised"
          >
            <Sparkles className="size-3 text-accent" />
            Ask AI to help connect secrets
            <ExternalLink className="size-3 opacity-60" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

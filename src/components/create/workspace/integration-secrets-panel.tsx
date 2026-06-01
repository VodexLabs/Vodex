"use client";

import * as React from "react";
import { Loader2, Shield, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

const GUIDES: Record<string, { title: string; href: string; hint: string }> = {
  SUPABASE_URL: {
    title: "Supabase project URL",
    href: "https://supabase.com/dashboard/project/_/settings/api",
    hint: "Project Settings → API → Project URL",
  },
  SUPABASE_ANON_KEY: {
    title: "Supabase anon key",
    href: "https://supabase.com/dashboard/project/_/settings/api",
    hint: "Project Settings → API → anon public key",
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    title: "Supabase service role key",
    href: "https://supabase.com/dashboard/project/_/settings/api",
    hint: "Never expose in the browser — server only. API → service_role secret.",
  },
  OPENAI_API_KEY: {
    title: "OpenAI API key",
    href: "https://platform.openai.com/api-keys",
    hint: "Create a secret key in the OpenAI dashboard — use env only, never client-side.",
  },
  ANTHROPIC_API_KEY: {
    title: "Anthropic API key",
    href: "https://console.anthropic.com/settings/keys",
    hint: "Console → API keys — restrict usage to your server IPs when possible.",
  },
  GOOGLE_GENERATIVE_AI_API_KEY: {
    title: "Google Generative AI key",
    href: "https://aistudio.google.com/app/apikey",
    hint: "AI Studio → Get API key — enable only the models you need.",
  },
  STRIPE_SECRET_KEY: {
    title: "Stripe secret key",
    href: "https://dashboard.stripe.com/apikeys",
    hint: "Developers → API keys — use a restricted key when possible.",
  },
  STRIPE_PUBLISHABLE_KEY: {
    title: "Stripe publishable key",
    href: "https://dashboard.stripe.com/apikeys",
    hint: "Safe for client-side — Developers → API keys.",
  },
  RESEND_API_KEY: {
    title: "Resend API key",
    href: "https://resend.com/api-keys",
    hint: "Create an API key in the Resend dashboard.",
  },
  CLOUDFLARE_R2_ACCESS_KEY_ID: {
    title: "Cloudflare R2 credentials",
    href: "https://developers.cloudflare.com/r2/api/tokens/",
    hint: "R2 → Manage R2 API tokens — create S3-compatible keys.",
  },
  SLACK_BOT_TOKEN: {
    title: "Slack bot token",
    href: "https://api.slack.com/apps",
    hint: "Your Slack app → OAuth & Permissions → Bot User OAuth Token.",
  },
  GITHUB_TOKEN: {
    title: "GitHub token",
    href: "https://github.com/settings/tokens",
    hint: "Fine-grained or classic PAT with minimal scopes.",
  },
  FIREBASE_SERVICE_ACCOUNT_JSON: {
    title: "Firebase service account",
    href: "https://console.firebase.google.com/",
    hint: "Project settings → Service accounts → Generate new private key.",
  },
  GOOGLE_OAUTH_CLIENT_ID: {
    title: "Google OAuth client ID",
    href: "https://console.cloud.google.com/apis/credentials",
    hint: "APIs & Services → Credentials → OAuth 2.0 Client IDs.",
  },
  GOOGLE_OAUTH_CLIENT_SECRET: {
    title: "Google OAuth client secret",
    href: "https://console.cloud.google.com/apis/credentials",
    hint: "Same OAuth client — copy the secret once; Vodex will not show it again.",
  },
};

export function IntegrationSecretsPanel({
  projectId,
  requiredKeys,
  className,
}: {
  projectId: string | null;
  requiredKeys: string[];
  className?: string;
}) {
  const [configured, setConfigured] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [values, setValues] = React.useState<Record<string, string>>({});

  const keys = React.useMemo(() => [...new Set(requiredKeys)].sort(), [requiredKeys]);
  const keysSig = keys.join(",");

  React.useEffect(() => {
    if (!projectId || keys.length === 0) {
      setConfigured(new Set());
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/projects/${projectId}/secrets`, { credentials: "include" });
        const j = (await r.json()) as { keys?: Array<{ name: string }> };
        if (!cancelled && r.ok && j.keys) {
          setConfigured(new Set(j.keys.map((k) => k.name)));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, keysSig, keys.length]);

  if (!projectId || keys.length === 0) return null;

  async function saveOne(keyName: string) {
    const value = values[keyName]?.trim();
    if (!projectId || !value) return;
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
      toast.success(`Stored ${keyName}`);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-surface/60 p-3 ring-1 ring-border/60 backdrop-blur-sm",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <Shield className="size-3.5 text-accent" strokeWidth={1.75} />
        <p className="text-[11px] font-semibold text-foreground">Integration secrets</p>
        {loading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
      </div>
      <p className="mb-3 text-[10.5px] leading-relaxed text-muted-foreground">
        Your build mentioned external services. Save keys here — never paste production secrets into chat.
        Values are encrypted server-side; we never show them again after save.
      </p>
      <ul className="max-h-48 space-y-3 overflow-y-auto pr-1">
        {keys.map((key) => {
          const guide = GUIDES[key] ?? {
            title: key,
            href: "https://duckduckgo.com/?q=" + encodeURIComponent(`${key} api key dashboard`),
            hint: "Retrieve this credential from your provider’s dashboard.",
          };
          const done = configured.has(key);
          return (
            <li key={key} className="rounded-lg bg-background/80 p-2.5 ring-1 ring-border/50">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-foreground">{guide.title}</p>
                  <p className="text-[10px] text-muted-foreground">{key}</p>
                  <p className="mt-1 text-[10px] leading-snug text-muted-foreground/90">{guide.hint}</p>
                  <a
                    href={guide.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-accent hover:underline"
                  >
                    How to get this <ExternalLink className="size-2.5" />
                  </a>
                </div>
                {done && (
                  <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-positive">
                    <CheckCircle2 className="size-3" /> Saved
                  </span>
                )}
              </div>
              <input
                type="password"
                autoComplete="off"
                value={values[key] ?? ""}
                placeholder={done ? "•••••••• (stored)" : "Paste once…"}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                className="mt-2 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] outline-none transition placeholder:text-muted-foreground/50 focus-visible:border-accent/40 focus-visible:ring-2 focus-visible:ring-ring/35"
              />
              <Button
                type="button"
                size="xs"
                variant="accent"
                className="mt-2 h-7 w-full text-[11px]"
                disabled={saving === key || !values[key]?.trim()}
                onClick={() => void saveOne(key)}
              >
                {saving === key ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : done ? (
                  "Rotate secret"
                ) : (
                  "Save securely"
                )}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

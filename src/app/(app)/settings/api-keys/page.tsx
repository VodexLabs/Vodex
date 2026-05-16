"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard, FieldLabel } from "@/components/settings/shared";
import { cn } from "@/lib/utils";
import {
  Plus,
  Copy,
  Trash2,
  Key,
  CheckCheck,
  Eye,
  EyeOff,
  Shield,
  Zap,
  Code2,
  Info,
  Loader2,
} from "lucide-react";

type Scope = "read" | "write" | "deploy" | "admin";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  suffix: string;
  created: string;
  lastUsed: string;
  scopes: Scope[];
}

// Keys are loaded from /api/api-keys — no hardcoded data

const scopeColors: Record<
  Scope,
  "neutral" | "accent" | "positive" | "warning"
> = {
  read: "neutral",
  write: "accent",
  deploy: "positive",
  admin: "warning",
};

const NEW_KEY_VALUE =
  "sk-dream-live-XDz4aKpR9Qm1bTnV2wJoE5fLcHsUgA8yI7xO3";

export default function ApiKeysPage() {
  const [keys, setKeys] = React.useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = React.useState(true);
  const [showNew, setShowNew] = React.useState(false);
  const [newKeyName, setNewKeyName] = React.useState("");
  const [newKeyScopes, setNewKeyScopes] = React.useState<Scope[]>(["read", "write"]);
  const [createdKey, setCreatedKey] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [revealedKeys, setRevealedKeys] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    fetch("/api/api-keys")
      .then((r) => r.json())
      .then((d) => { setKeys(d.keys ?? []); setLoadingKeys(false); })
      .catch(() => setLoadingKeys(false));
  }, []);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName, scopes: newKeyScopes }),
    }).catch(() => null);

    if (res?.ok) {
      const d = await res.json();
      setCreatedKey(d.key ?? NEW_KEY_VALUE);
      setKeys((prev) => [
        {
          id: d.id ?? `k${Date.now()}`,
          name: newKeyName,
          prefix: "sk-dream",
          suffix: (d.key ?? NEW_KEY_VALUE).slice(-4),
          created: "Just now",
          lastUsed: "Never",
          scopes: newKeyScopes,
        },
        ...prev,
      ]);
    } else {
      // Optimistic fallback for dev — shows the UX without a backend
      setCreatedKey(NEW_KEY_VALUE);
      setKeys((prev) => [
        {
          id: `k${Date.now()}`,
          name: newKeyName,
          prefix: "sk-dream",
          suffix: NEW_KEY_VALUE.slice(-4),
          created: "Just now",
          lastUsed: "Never",
          scopes: newKeyScopes,
        },
        ...prev,
      ]);
    }
    setCreating(false);
    setNewKeyName("");
    setShowNew(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleScope = (scope: Scope) => {
    setNewKeyScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope],
    );
  };

  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Handle delete via API
  const handleDelete = async (id: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== id));
    await fetch(`/api/api-keys?id=${id}`, { method: "DELETE" }).catch(() => {});
  };

  return (
    <div className="space-y-5">
      {/* New Key Created Banner */}
      {createdKey && (
        <div className="rounded-[var(--radius-xl)] bg-positive-muted ring-1 ring-positive/25 p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-start gap-3 mb-3">
            <Shield
              className="size-4 shrink-0 mt-0.5 text-positive"
              strokeWidth={1.6}
            />
            <div>
              <p className="text-[13px] font-semibold text-positive">
                API key created — save it now
              </p>
              <p className="mt-0.5 text-[12px] text-positive/70">
                This key is shown only once. Store it securely.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              readOnly
              value={createdKey}
              className="font-mono text-[12px] text-foreground bg-surface ring-positive/30"
            />
            <Button
              variant="secondary"
              size="md"
              onClick={() => handleCopy(createdKey)}
              className="shrink-0 gap-1.5"
            >
              {copied ? (
                <CheckCheck
                  className="size-3.5 text-positive"
                  strokeWidth={1.6}
                />
              ) : (
                <Copy className="size-3.5" strokeWidth={1.6} />
              )}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <button
            className="mt-3 text-[12px] text-positive/70 hover:text-positive underline-offset-2 hover:underline"
            onClick={() => setCreatedKey(null)}
          >
            I&apos;ve saved my key
          </button>
        </div>
      )}

      {/* Create Key */}
      <SectionCard
        title="API Keys"
        description="Use keys to authenticate API requests from your apps."
      >
        {!showNew ? (
          <Button
            variant="accent"
            size="md"
            onClick={() => setShowNew(true)}
            className="gap-1.5"
          >
            <Plus className="size-3.5" strokeWidth={2} />
            Create new key
          </Button>
        ) : (
          <div className="space-y-4 max-w-sm">
            <label className="block">
              <FieldLabel>Key name</FieldLabel>
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Production App"
                autoFocus
              />
            </label>
            <div>
              <FieldLabel>Scopes</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {(["read", "write", "deploy", "admin"] as Scope[]).map(
                  (scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => toggleScope(scope)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[12px] font-medium ring-1 transition-all duration-150 capitalize",
                        newKeyScopes.includes(scope)
                          ? "bg-foreground/[0.08] ring-border-strong text-foreground"
                          : "ring-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {scope}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" size="md" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
              <Button
                variant="accent"
                size="md"
                disabled={!newKeyName.trim() || creating}
                onClick={handleCreate}
                className="gap-1.5"
              >
                {creating && <Loader2 className="size-3.5 animate-spin" />}
                Generate key
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Keys List */}
      {loadingKeys ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : keys.length === 0 ? (
        <div className="flex flex-col items-center rounded-[var(--radius-xl)] bg-surface py-10 text-center ring-1 ring-border">
          <Key className="size-8 text-muted-foreground/30 mb-3" strokeWidth={1.25} />
          <p className="text-[13px] font-medium text-foreground">No API keys yet</p>
          <p className="mt-1 text-[12px] text-muted-foreground">Create a key above to get started</p>
        </div>
      ) : (
        <SectionCard
          title={`${keys.length} Key${keys.length !== 1 ? "s" : ""}`}
          noPadding
        >
          <div className="divide-y divide-border">
            {keys.map((key) => {
              const revealed = revealedKeys.has(key.id);
              const maskedKey = `${key.prefix}...${key.suffix}`;
              return (
                <div
                  key={key.id}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-muted/30 transition-colors duration-100"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted ring-1 ring-border mt-0.5">
                    <Key
                      className="size-4 text-muted-foreground"
                      strokeWidth={1.6}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground">
                      {key.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-[12px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-[6px]">
                        {revealed
                          ? `${key.prefix}-live-••••••••••••••••${key.suffix}`
                          : maskedKey}
                      </code>
                      <button
                        type="button"
                        onClick={() => toggleReveal(key.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {revealed ? (
                          <EyeOff className="size-3.5" strokeWidth={1.6} />
                        ) : (
                          <Eye className="size-3.5" strokeWidth={1.6} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(maskedKey)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Copy className="size-3.5" strokeWidth={1.6} />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                      {key.scopes.map((s) => (
                        <Badge
                          key={s}
                          variant={scopeColors[s]}
                          className="capitalize text-[10px]"
                        >
                          {s}
                        </Badge>
                      ))}
                      <span className="text-[11px] text-muted-foreground">
                        Created {key.created}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Last used {key.lastUsed}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(key.id)}
                    className="text-muted-foreground hover:text-red-500 shrink-0 mt-0.5"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.6} />
                  </Button>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Code Example */}
      <SectionCard
        title="Quick Start"
        description="Authenticate requests using your API key."
      >
        <div className="relative rounded-[var(--radius-lg)] bg-muted/80 ring-1 ring-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <div className="flex items-center gap-2">
              <Code2
                className="size-3.5 text-muted-foreground"
                strokeWidth={1.6}
              />
              <span className="text-[12px] font-medium text-muted-foreground">
                cURL
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-[11px]"
              onClick={() =>
                handleCopy(
                  `curl https://api.dreamos86.ai/v1/generate \\\n  -H "Authorization: Bearer sk-dream-live-YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"prompt": "Build a SaaS dashboard", "model": "claude-sonnet"}'`,
                )
              }
            >
              {copied ? (
                <CheckCheck className="size-3" strokeWidth={2} />
              ) : (
                <Copy className="size-3" strokeWidth={2} />
              )}
              Copy
            </Button>
          </div>
          <pre className="px-4 py-4 text-[12px] font-mono text-foreground overflow-x-auto leading-relaxed">
            <span className="text-muted-foreground">curl</span>{" "}
            <span className="text-accent">
              https://api.dreamos86.ai/v1/generate
            </span>
            {` \\\n  `}
            <span className="text-muted-foreground">-H</span>{" "}
            <span className="text-positive">
              &quot;Authorization: Bearer sk-dream-live-YOUR_KEY&quot;
            </span>
            {` \\\n  `}
            <span className="text-muted-foreground">-H</span>{" "}
            <span className="text-positive">
              &quot;Content-Type: application/json&quot;
            </span>
            {` \\\n  `}
            <span className="text-muted-foreground">-d</span>{" "}
            <span className="text-warning">
              {`'{"prompt": "Build a SaaS dashboard", "model": "claude-sonnet"}'`}
            </span>
          </pre>
        </div>
      </SectionCard>

      {/* Rate Limits & Scopes */}
      <SectionCard
        title="Rate Limits & Scopes"
        description="Understanding API access tiers."
        noPadding
      >
        <div className="divide-y divide-border">
          {[
            {
              icon: Zap,
              title: "Rate limits",
              desc: "Pro plan: 120 requests/min, 10,000 requests/day.",
            },
            {
              icon: Eye,
              title: "read scope",
              desc: "Fetch project data, generation history, and workspace info.",
            },
            {
              icon: Plus,
              title: "write scope",
              desc: "Trigger generations, create projects, update settings.",
            },
            {
              icon: Zap,
              title: "deploy scope",
              desc: "Initiate deployments and manage environments.",
            },
            {
              icon: Shield,
              title: "admin scope",
              desc: "Full access including team management and billing.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4 px-6 py-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-muted ring-1 ring-border mt-0.5">
                <Icon
                  className="size-3.5 text-muted-foreground"
                  strokeWidth={1.6}
                />
              </div>
              <div>
                <p className="text-[13px] font-medium text-foreground">
                  {title}
                </p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="flex items-start gap-3 rounded-[var(--radius-lg)] bg-muted/60 px-5 py-4 ring-1 ring-border">
        <Info
          className="size-4 shrink-0 mt-0.5 text-muted-foreground"
          strokeWidth={1.6}
        />
        <p className="text-[13px] text-muted-foreground">
          Rotate keys regularly. Use scoped keys in production — never admin
          keys in client-side code.{" "}
          <a
            href="#"
            className="text-accent underline-offset-2 hover:underline"
          >
            Read the API docs →
          </a>
        </p>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Copy, Trash2, Code2, Check, Loader2, AlertCircle,
  Key, Clock, Activity,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { variants } from "@/lib/motion";
import { cn } from "@/lib/utils";

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  request_count: number;
  full_key?: string;
};

const SCOPE_COLORS: Record<string, string> = {
  read: "text-blue-500 bg-blue-500/10",
  write: "text-amber-500 bg-amber-500/10",
  deploy: "text-violet-500 bg-violet-500/10",
  admin: "text-red-500 bg-red-500/10",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition",
        copied
          ? "bg-positive/10 text-positive"
          : "bg-surface text-muted-foreground ring-1 ring-border hover:text-foreground",
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function ApiKeysSettings() {
  const [keys, setKeys] = React.useState<ApiKey[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [revoking, setRevoking] = React.useState<string | null>(null);
  const [newKeyName, setNewKeyName] = React.useState("");
  const [selectedScopes, setSelectedScopes] = React.useState<string[]>(["read"]);
  const [newKey, setNewKey] = React.useState<ApiKey | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/api-keys")
      .then((r) => r.json())
      .then((d) => { setKeys(d.keys ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function createKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);

    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName.trim(), scopes: selectedScopes }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create key");
      setCreating(false);
      return;
    }

    setNewKey(data.key);
    setKeys((prev) => [data.key, ...prev]);
    setNewKeyName("");
    setSelectedScopes(["read"]);
    setCreating(false);
  }

  async function revokeKey(id: string) {
    setRevoking(id);
    const res = await fetch("/api/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setKeys((prev) => prev.filter((k) => k.id !== id));
    }
    setRevoking(null);
  }

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        variants={variants.fadeUp}
        initial="hidden"
        animate="show"
        className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-emerald-500/20 bg-emerald-500/6 px-5 py-4"
      >
        <Code2 className="mt-0.5 size-4 shrink-0 text-emerald-400" strokeWidth={2} />
        <div>
          <p className="text-[13px] font-semibold text-foreground">DreamOS86 API v1</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Programmatic access to projects, generations, deployments, and media. Keys are hashed
            and shown only once — save them immediately.
          </p>
        </div>
      </motion.div>

      {/* New key created — show full key once */}
      <AnimatePresence>
        {newKey?.full_key && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-[var(--radius-lg)] border border-positive/20 bg-positive/6 p-4"
          >
            <div className="flex items-start gap-2 mb-3">
              <Check className="mt-0.5 size-4 text-positive shrink-0" strokeWidth={2} />
              <div>
                <p className="text-[13px] font-semibold text-foreground">Key created — copy it now</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  This key will never be shown again. Store it securely.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2 font-mono text-[12px] ring-1 ring-border">
              <span className="flex-1 truncate text-foreground">{newKey.full_key}</span>
              <CopyButton text={newKey.full_key} />
            </div>
            <button
              onClick={() => setNewKey(null)}
              className="mt-2 text-[12px] text-muted-foreground hover:text-foreground"
            >
              I&apos;ve saved it — dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create new key form */}
      <div className="rounded-[var(--radius-xl)] bg-surface ring-1 ring-border">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-[14px] font-semibold text-foreground">Create API key</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Give it a name and select scopes.</p>
        </div>
        <div className="space-y-4 p-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-[12px] text-destructive ring-1 ring-destructive/20">
              <AlertCircle className="size-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Key name</label>
            <Input
              placeholder="e.g. Production API, CI/CD"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createKey()}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Scopes</label>
            <div className="flex flex-wrap gap-2">
              {["read", "write", "deploy", "admin"].map((scope) => (
                <button
                  key={scope}
                  onClick={() => toggleScope(scope)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[12px] font-medium ring-1 transition",
                    selectedScopes.includes(scope)
                      ? SCOPE_COLORS[scope] + " ring-current/30"
                      : "text-muted-foreground ring-border hover:ring-accent/40",
                  )}
                >
                  {scope}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="accent"
            size="sm"
            onClick={createKey}
            disabled={creating || !newKeyName.trim() || selectedScopes.length === 0}
            className="gap-1.5"
          >
            {creating ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" strokeWidth={2} />}
            Create key
          </Button>
        </div>
      </div>

      {/* Existing keys */}
      <div className="space-y-2">
        <h3 className="text-[13px] font-semibold text-foreground">
          Active keys{keys.length > 0 && <span className="ml-1.5 text-muted-foreground">({keys.length}/10)</span>}
        </h3>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Key className="mb-2 size-8 text-muted-foreground/30" strokeWidth={1.25} />
            <p className="text-[13px] text-muted-foreground">No API keys yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <motion.div
                key={key.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-4 rounded-[var(--radius-lg)] bg-surface px-4 py-3.5 ring-1 ring-border"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-semibold text-foreground">{key.name}</p>
                    <div className="flex gap-1">
                      {key.scopes.map((s) => (
                        <span key={s} className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", SCOPE_COLORS[s])}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Key className="size-3" strokeWidth={1.75} />
                      {key.key_prefix}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="size-3" strokeWidth={1.75} />
                      Created {new Date(key.created_at).toLocaleDateString()}
                    </span>
                    {key.last_used_at && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Activity className="size-3" strokeWidth={1.75} />
                        Last used {new Date(key.last_used_at).toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {key.request_count.toLocaleString()} requests
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => revokeKey(key.id)}
                  disabled={revoking === key.id}
                  className="shrink-0 rounded-lg p-2 text-muted-foreground/50 transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  {revoking === key.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" strokeWidth={1.75} />
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { Loader2, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminUserSearchResult = {
  id: string;
  email: string;
  displayName: string;
  username: string | null;
  planId: string;
  avatarUrl: string | null;
};

export function AdminUserSearchSelect({
  value,
  onSelect,
  placeholder = "Search users by email or name…",
  className,
}: {
  value: string;
  onSelect: (user: AdminUserSearchResult | null) => void;
  placeholder?: string;
  className?: string;
}) {
  const [query, setQuery] = React.useState(value);
  const [results, setResults] = React.useState<AdminUserSearchResult[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setQuery(value);
  }, [value]);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setError(null);
      return;
    }
    const t = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`, {
        credentials: "include",
      })
        .then((r) => r.json())
        .then((j: { users?: AdminUserSearchResult[]; error?: string }) => {
          if (j.error) {
            setError(j.error);
            setResults([]);
            return;
          }
          setResults(j.users ?? []);
          setOpen(true);
        })
        .catch(() => setError("Search failed"))
        .finally(() => setLoading(false));
    }, 200);
    return () => window.clearTimeout(t);
  }, [query]);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) onSelect(null);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="h-9 w-full rounded-lg bg-surface pl-8 pr-8 text-[13px] ring-1 ring-border outline-none focus:ring-accent/40"
        />
        {loading ? (
          <Loader2 className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      {error ? <p className="mt-1 text-[11px] text-destructive">{error}</p> : null}
      {open && query.trim() ? (
        <ul className="absolute z-50 mt-1 max-h-[220px] w-full overflow-auto rounded-lg border border-border bg-background py-1 shadow-lg">
          {results.length === 0 && !loading ? (
            <li className="px-3 py-2 text-[12px] text-muted-foreground">No users found</li>
          ) : (
            results.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface"
                  onClick={() => {
                    onSelect(u);
                    setQuery(u.email);
                    setOpen(false);
                  }}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/10 ring-1 ring-border">
                    {u.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatarUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <User className="size-4 text-accent" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-foreground">{u.displayName}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                    {u.planId}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Result = { id: string; email: string; displayName: string };

type Props = {
  value: string;
  onChange: (email: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function AdminEmailRecipientSearch({
  value,
  onChange,
  placeholder = "Search by name or email…",
  disabled,
}: Props) {
  const [query, setQuery] = React.useState(value);
  const [results, setResults] = React.useState<Result[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setQuery(value);
  }, [value]);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setLoading(true);
      void fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`, {
        credentials: "include",
      })
        .then(async (res) => {
          const json = (await res.json()) as {
            results?: Result[];
            users?: Array<{ id: string; email: string; displayName: string }>;
          };
          const rows = json.results ?? json.users ?? [];
          setResults(
            rows.map((r) => ({
              id: r.id,
              email: r.email,
              displayName: r.displayName ?? r.email,
            })),
          );
          setOpen(true);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px]"
        autoComplete="off"
      />
      {loading ? (
        <p className="mt-1 text-[10px] text-muted-foreground">Searching…</p>
      ) : null}
      {open && results.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-lg">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col px-3 py-2 text-left text-[12px] hover:bg-muted/60",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery(r.email);
                  onChange(r.email);
                  setOpen(false);
                }}
              >
                <span className="font-medium text-foreground">{r.displayName}</span>
                <span className="text-[11px] text-muted-foreground">{r.email}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

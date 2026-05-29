import type { BuildFile } from "@/lib/build/generated-file-utils";
import { normalizeBuildFilePath } from "@/lib/build/generated-file-utils";
import type { MissingImport } from "@/lib/build/import-graph";

function componentNameFromPath(resolved: string): string {
  const base = resolved.split("/").pop() ?? "Component";
  return base.replace(/\.(tsx|jsx|ts|js)$/i, "");
}

function stubComponentTsx(name: string): string {
  return `import React from "react";

export function ${name}() {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">${name}</h2>
      <p className="mt-1 text-xs text-muted-foreground">Live data will appear here after you connect your backend.</p>
    </section>
  );
}
`;
}

function stubPage(routeLabel: string): string {
  return `import React from "react";

export default function Page() {
  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">${routeLabel}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage ${routeLabel.toLowerCase()} with clear status and actions.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground">Metric {i}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{12 * i}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
`;
}

/** Deterministic repair: create missing relative imports and thin route pages. */
export function repairBuildFiles(input: {
  files: BuildFile[];
  missingImports: MissingImport[];
  requiredPageSlugs?: string[];
}): BuildFile[] {
  const byPath = new Map<string, BuildFile>();
  for (const f of input.files) {
    byPath.set(normalizeBuildFilePath(f.path), { ...f, path: normalizeBuildFilePath(f.path) });
  }

  for (const mi of input.missingImports) {
    if (!mi.resolvedPath) continue;
    const name = componentNameFromPath(mi.resolvedPath);
    const path =
      mi.resolvedPath.endsWith(".tsx") || mi.resolvedPath.endsWith(".jsx")
        ? normalizeBuildFilePath(mi.resolvedPath)
        : `${normalizeBuildFilePath(mi.resolvedPath)}.tsx`;
    if (!byPath.has(path)) {
      byPath.set(path, { path, content: stubComponentTsx(name) });
    }
  }

  const slugs = input.requiredPageSlugs ?? [];
  for (const slug of slugs) {
    const clean = slug.replace(/^\//, "");
    if (clean === "dashboard") {
      if (!byPath.has("app/page.tsx") && !byPath.has("app/dashboard/page.tsx")) {
        byPath.set("app/page.tsx", {
          path: "app/page.tsx",
          content: stubPage("Inventory dashboard"),
        });
      }
      continue;
    }
    const path = `app/${clean}/page.tsx`;
    if (!byPath.has(path)) {
      const label = clean.charAt(0).toUpperCase() + clean.slice(1).replace(/-/g, " ");
      byPath.set(path, { path, content: stubPage(label) });
    }
  }

  if (!byPath.has("app/layout.tsx") && !byPath.has("app/layout.jsx")) {
    byPath.set("app/layout.tsx", {
      path: "app/layout.tsx",
      content: `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
`,
    });
  }

  return [...byPath.values()];
}

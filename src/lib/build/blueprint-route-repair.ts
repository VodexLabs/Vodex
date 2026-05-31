/**
 * Auto-scaffold missing blueprint App Router pages so route-map mismatches do not fail builds.
 */
import type { BuildFile } from "@/lib/build/generated-file-utils";
import { normalizeBuildFilePath } from "@/lib/build/generated-file-utils";
import { normalizeAppRouterBuildFiles } from "@/lib/build/app-router-route-normalizer";

function slugFromRoute(route: string): string {
  return route.replace(/^\//, "").trim().toLowerCase();
}

function hasAppPage(files: BuildFile[], slug: string): boolean {
  const norm = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return files.some((f) =>
    new RegExp(`(^|/)app/${norm}/page\\.(tsx|jsx|js)$`, "i").test(f.path.replace(/\\/g, "/")),
  );
}

function defaultPageForSlug(slug: string, appName: string): string {
  const title = slug
    .split(/[-_/]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return `"use client";

export default function ${title.replace(/[^a-zA-Z0-9]/g, "")}Page() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">${title}</h1>
      <p className="mt-2 text-sm text-slate-600">
        ${appName} — this screen was added automatically so your app routes stay connected.
      </p>
    </main>
  );
}
`;
}

export type BlueprintRouteRepairResult = {
  files: BuildFile[];
  addedRoutes: string[];
  moved: string[];
};

/** Add stub pages for blueprint routes that are missing from generated files. */
export function repairMissingBlueprintRoutes(
  inputFiles: BuildFile[],
  blueprintRoutes: string[] | null | undefined,
  appName = "Your app",
): BlueprintRouteRepairResult {
  const normalized = normalizeAppRouterBuildFiles(inputFiles, {
    blueprintRoutes: blueprintRoutes ?? undefined,
    appName,
  });

  const byPath = new Map<string, BuildFile>();
  for (const f of normalized.files) {
    byPath.set(normalizeBuildFilePath(f.path), f);
  }

  const addedRoutes: string[] = [];
  for (const route of blueprintRoutes ?? []) {
    const slug = slugFromRoute(route);
    if (!slug || slug === "dashboard" || slug === "home") continue;
    if (hasAppPage([...byPath.values()], slug)) continue;

    const pagePath = `app/${slug}/page.tsx`;
    byPath.set(pagePath, {
      path: pagePath,
      content: defaultPageForSlug(slug, appName),
      language: "typescript",
    });
    addedRoutes.push(route);
  }

  return {
    files: [...byPath.values()],
    addedRoutes,
    moved: normalized.moved,
  };
}

export function parseMissingBlueprintRoutes(failures: string[]): string[] {
  const hit = failures.find((f) => f.startsWith("missing_blueprint_routes:"));
  if (!hit) return [];
  const raw = hit.slice("missing_blueprint_routes:".length);
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

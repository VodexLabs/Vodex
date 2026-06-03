import type { ZipImportFile } from "@/lib/import/zip-file-validator";
import { detectFramework, detectRoutes } from "@/lib/import/framework-detector";
import { detectPackageScripts, detectPackageManager } from "@/lib/import/package-script-detector";
import { detectDependencies } from "@/lib/import/dependency-detector";
import { detectEnvRequirements } from "@/lib/import/env-requirement-detector";
import { scoreImportQuality } from "@/lib/import/import-quality-score";
import { detectLegacyPlatform } from "@/lib/import/legacy-platform-detector";
import { pickPreviewEntry } from "@/lib/preview/preview-sandbox";

export type ImportedAppValidation = {
  valid: boolean;
  blockers: string[];
  warnings: string[];
  framework: ReturnType<typeof detectFramework>;
  routes: string[];
  scripts: ReturnType<typeof detectPackageScripts>;
  packageManager: ReturnType<typeof detectPackageManager>;
  dependencies: ReturnType<typeof detectDependencies>;
  envRequirements: ReturnType<typeof detectEnvRequirements>;
  qualityScore: number;
  previewReady: boolean;
  publishReady: boolean;
  legacy: ReturnType<typeof detectLegacyPlatform>;
  previewEntry: ReturnType<typeof pickPreviewEntry>;
};

export function validateImportedApp(
  files: ZipImportFile[],
  opts?: { rejectedSecrets?: string[] },
): ImportedAppValidation {
  const framework = detectFramework(files);
  const routes = detectRoutes(files);
  const scripts = detectPackageScripts(files);
  const packageManager = detectPackageManager(files);
  const dependencies = detectDependencies(files);
  const envRequirements = detectEnvRequirements(files);
  const quality = scoreImportQuality({
    files,
    framework,
    routes,
    scripts,
    dependencies,
    envRequirements,
    rejectedSecrets: opts?.rejectedSecrets ?? [],
  });

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (files.length === 0) blockers.push("No importable files");
  if (framework.id === "unknown" && !files.some((f) => /index\.html$/i.test(f.path))) {
    warnings.push("Framework could not be detected — preview may be limited");
  }
  if (!scripts.build && framework.id !== "static") {
    warnings.push("No build script detected in package.json");
  }
  if (routes.length === 0 && framework.id !== "static") {
    warnings.push("No routes/pages detected");
  }
  if ((opts?.rejectedSecrets?.length ?? 0) > 0) {
    warnings.push(`${opts!.rejectedSecrets!.length} secret/env files excluded from import`);
  }

  const legacy = detectLegacyPlatform(files);
  if (legacy.message) warnings.push(legacy.message);

  const previewFiles = files.map((f) => ({ path: f.path, content: f.content }));
  const previewEntry = pickPreviewEntry(previewFiles);

  if (!previewEntry) {
    blockers.push(
      "No renderable entry found (need index.html, app/page.tsx, pages/index, or src/main)",
    );
  } else if (previewEntry.kind === "html" && previewEntry.content.trim().length < 80) {
    blockers.push("index.html is empty or too small to preview");
  }

  const previewReady =
    quality.total >= 70 && files.length > 0 && blockers.length === 0 && previewEntry != null;
  const publishReady =
    previewReady && quality.total >= 85 && routes.length > 0 && blockers.length === 0;

  return {
    valid: blockers.length === 0 && files.length > 0,
    blockers,
    warnings,
    framework,
    routes,
    scripts,
    packageManager,
    dependencies,
    envRequirements,
    qualityScore: quality.total,
    previewReady,
    publishReady,
    legacy,
    previewEntry,
  };
}

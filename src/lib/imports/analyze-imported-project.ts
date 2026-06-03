import type { ZipImportFile } from "@/lib/import/zip-file-validator";
import { extractAndAnalyzeZip } from "@/lib/import/zip-import-service";
import { detectImportedFramework } from "@/lib/imports/framework-detector";
import { analyzeLegacyAdapter } from "@/lib/imports/base44-lovable-adapter";
import { detectEnvRequirements } from "@/lib/import/env-requirement-detector";
import { detectRoutes } from "@/lib/import/framework-detector";
import { emptyImportDiagnostics, type ImportPreviewDiagnostics } from "@/lib/imports/import-diagnostics";
import { pickPreviewEntry } from "@/lib/preview/preview-sandbox";

export type AnalyzedImportProject = {
  files: ZipImportFile[];
  framework: ReturnType<typeof detectImportedFramework>;
  legacy: ReturnType<typeof analyzeLegacyAdapter>;
  routes: string[];
  envRequirements: ReturnType<typeof detectEnvRequirements>;
  blockers: string[];
  warnings: string[];
  previewEntry: ReturnType<typeof pickPreviewEntry>;
};

export async function analyzeZipBuffer(buffer: Buffer) {
  return extractAndAnalyzeZip(buffer);
}

export function analyzeImportedProjectFiles(files: ZipImportFile[]): AnalyzedImportProject {
  const framework = detectImportedFramework(files);
  const legacy = analyzeLegacyAdapter(files, framework);
  const routes = detectRoutes(files);
  const envRequirements = detectEnvRequirements(files);
  const blockers: string[] = [];
  const warnings: string[] = [...legacy.warnings];

  if (files.length === 0) blockers.push("No importable files");
  const previewFiles = files.map((f) => ({ path: f.path, content: f.content }));
  const previewEntry = pickPreviewEntry(previewFiles);
  if (!previewEntry) {
    blockers.push(
      "No renderable entry found (need index.html, app/page.tsx, pages/index, or src/main)",
    );
  }

  if (framework.id === "unknown" && !files.some((f) => /index\.html$/i.test(f.path))) {
    warnings.push("Framework could not be detected confidently");
  }

  if (!framework.scripts.build && !["static", "unknown"].includes(framework.id)) {
    warnings.push("No build script in package.json — preview may use static snapshot only");
  }

  if (framework.isSsrNext) {
    warnings.push(
      "Next.js SSR app detected — full runtime preview requires a preview worker unless static export is configured",
    );
  }

  return {
    files,
    framework,
    legacy,
    routes,
    envRequirements,
    blockers,
    warnings,
    previewEntry,
  };
}

export function analysisToDiagnostics(
  analysis: AnalyzedImportProject,
  partial?: Partial<ImportPreviewDiagnostics>,
): ImportPreviewDiagnostics {
  return emptyImportDiagnostics({
    framework: analysis.framework.id,
    frameworkLabel: analysis.framework.label,
    confidence: analysis.framework.confidence,
    legacyPlatform: analysis.legacy.platform,
    entryFiles: analysis.framework.entryFiles,
    packageManager: analysis.framework.packageManager,
    scripts: analysis.framework.scripts,
    blockers: analysis.blockers,
    warnings: analysis.warnings,
    missingEnvs: analysis.legacy.missingEnvs,
    ...partial,
  });
}

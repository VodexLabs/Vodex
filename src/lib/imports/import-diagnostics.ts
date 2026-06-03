import type { DetectedFrameworkId } from "@/lib/imports/framework-detector";

export type ImportPreviewStatus =
  | "files_saved"
  | "analyzing"
  | "installing"
  | "building"
  | "serving"
  | "validating"
  | "ready"
  | "failed"
  | "queued";

export type ImportPreviewDiagnostics = {
  framework: DetectedFrameworkId;
  frameworkLabel: string;
  confidence: number;
  legacyPlatform: "base44" | "lovable" | "bolt" | "v0" | null;
  entryFiles: string[];
  packageManager: string;
  scripts: Record<string, string>;
  blockers: string[];
  warnings: string[];
  buildStrategy: "static" | "vite_build" | "next_build" | "static_snapshot" | "queued_worker" | "none";
  previewStatus: ImportPreviewStatus;
  previewRenderable: boolean;
  sourceIntegrityOk: boolean;
  blockedReason: string | null;
  artifactPath: string | null;
  previewUrl: string | null;
  buildLogs: string;
  runtimeLogs: string;
  missingEnvs: string[];
  suggestedFixes: string[];
  lastPreviewBuildAt: string | null;
  jobId: string | null;
};

export function emptyImportDiagnostics(
  partial?: Partial<ImportPreviewDiagnostics>,
): ImportPreviewDiagnostics {
  return {
    framework: "unknown",
    frameworkLabel: "Unknown",
    confidence: 0,
    legacyPlatform: null,
    entryFiles: [],
    packageManager: "unknown",
    scripts: {},
    blockers: [],
    warnings: [],
    buildStrategy: "none",
    previewStatus: "files_saved",
    previewRenderable: false,
    sourceIntegrityOk: false,
    blockedReason: null,
    artifactPath: null,
    previewUrl: null,
    buildLogs: "",
    runtimeLogs: "",
    missingEnvs: [],
    suggestedFixes: [],
    lastPreviewBuildAt: null,
    jobId: null,
    ...partial,
  };
}

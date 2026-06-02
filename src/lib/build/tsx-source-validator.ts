import { parse } from "@babel/parser";
import type { BuildFile } from "@/lib/build/generated-file-utils";
import { findPrimaryAppPage } from "@/lib/build/source-integrity-validator";

export type TsxValidationIssue = {
  path: string;
  message: string;
  code: string;
};

export type TsxSourceValidationReport = {
  ok: boolean;
  issues: TsxValidationIssue[];
  validPaths: string[];
  primaryPath: string | null;
  primaryFileBytes: Record<string, number>;
};

const PAGE_RE = /(^|\/)app\/.*page\.(tsx|jsx)$/i;

function isPageFile(path: string): boolean {
  return PAGE_RE.test(path);
}

function hasExportDefault(source: string): boolean {
  return /export\s+default\s+(function|class|async\s+function|[\w$]+)/.test(source);
}

function hasCodeFenceLeak(source: string): boolean {
  return /```(?:tsx|jsx|typescript)?/.test(source);
}

function hasOrphanClassLine(source: string): boolean {
  return /^\s*class(Name)?=["'][^"']*["']>\s*$/m.test(source);
}

export function validateTsxSource(content: string, path: string): TsxValidationIssue[] {
  const issues: TsxValidationIssue[] = [];
  if (!content.trim()) {
    issues.push({ path, message: "empty file", code: "empty_file" });
    return issues;
  }
  if (hasCodeFenceLeak(content)) {
    issues.push({ path, message: "markdown code fence in source", code: "code_fence_leak" });
  }
  if (hasOrphanClassLine(content)) {
    issues.push({ path, message: "orphan class attribute line", code: "orphan_class_line" });
  }
  if (isPageFile(path) && !hasExportDefault(content)) {
    issues.push({ path, message: "missing export default", code: "missing_export_default" });
  }

  try {
    parse(content, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
      errorRecovery: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    issues.push({ path, message: msg.slice(0, 240), code: "parse_error" });
  }

  return issues;
}

export function validateBuildTsxSources(files: BuildFile[]): TsxSourceValidationReport {
  const renderable = files.filter((f) => /\.(tsx|jsx)$/i.test(f.path) && f.content?.trim());
  const issues: TsxValidationIssue[] = [];
  const validPaths: string[] = [];
  const primaryFileBytes: Record<string, number> = {};

  for (const f of renderable) {
    primaryFileBytes[f.path] = Buffer.byteLength(f.content, "utf8");
    const fileIssues = validateTsxSource(f.content, f.path);
    if (fileIssues.length) issues.push(...fileIssues);
    else validPaths.push(f.path);
  }

  const primary = findPrimaryAppPage(files);
  const primaryPath = primary?.path ?? null;
  if (primary) {
    const primaryIssues = validateTsxSource(primary.content, primary.path);
    const primaryOk = primaryIssues.length === 0;
    if (!primaryOk) {
      for (const pi of primaryIssues) {
        if (!issues.some((i) => i.path === pi.path && i.code === pi.code)) {
          issues.push(pi);
        }
      }
    }
  }

  return {
    ok: issues.length === 0 && Boolean(primaryPath),
    issues,
    validPaths,
    primaryPath,
    primaryFileBytes,
  };
}

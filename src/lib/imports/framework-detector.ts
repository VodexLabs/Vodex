import type { ZipImportFile } from "@/lib/import/zip-file-validator";

export type DetectedFrameworkId =
  | "static"
  | "vite"
  | "nextjs_app"
  | "nextjs_pages"
  | "cra"
  | "react"
  | "base44"
  | "lovable"
  | "bolt"
  | "v0"
  | "unknown";

export type FrameworkDetection = {
  id: DetectedFrameworkId;
  label: string;
  confidence: number;
  entryFiles: string[];
  packageManager: "npm" | "pnpm" | "yarn" | "bun" | "unknown";
  scripts: Record<string, string>;
  hasViteConfig: boolean;
  hasNextConfig: boolean;
  isSsrNext: boolean;
};

function norm(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

function readPackageJson(files: ZipImportFile[]): {
  deps: Record<string, string>;
  scripts: Record<string, string>;
} | null {
  const pkg = files.find((f) => norm(f.path) === "package.json");
  if (!pkg) return null;
  try {
    const j = JSON.parse(pkg.content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };
    return {
      deps: { ...j.dependencies, ...j.devDependencies },
      scripts: j.scripts ?? {},
    };
  } catch {
    return null;
  }
}

function detectPackageManager(files: ZipImportFile[]): FrameworkDetection["packageManager"] {
  if (files.some((f) => norm(f.path) === "pnpm-lock.yaml")) return "pnpm";
  if (files.some((f) => norm(f.path) === "yarn.lock")) return "yarn";
  if (files.some((f) => norm(f.path) === "bun.lockb" || f.path === "bun.lock")) return "bun";
  if (files.some((f) => norm(f.path) === "package-lock.json")) return "npm";
  if (files.some((f) => norm(f.path) === "package.json")) return "npm";
  return "unknown";
}

function collectEntryFiles(files: ZipImportFile[]): string[] {
  const entries: string[] = [];
  for (const f of files) {
    const p = norm(f.path);
    if (/^index\.html$/i.test(p) || /\/index\.html$/i.test(p)) entries.push(p);
    if (/^src\/main\.(tsx|jsx|ts|js)$/i.test(p)) entries.push(p);
    if (/^app\/page\.(tsx|jsx|ts|js)$/i.test(p)) entries.push(p);
    if (/^pages\/index\.(tsx|jsx|ts|js)$/i.test(p)) entries.push(p);
    if (/^src\/App\.(tsx|jsx)$/i.test(p)) entries.push(p);
    if (/^src\/index\.(tsx|jsx)$/i.test(p)) entries.push(p);
  }
  return [...new Set(entries)].slice(0, 12);
}

const BASE44_RE =
  /@base44\/|base44\.dev|BASE44_|from\s+['"]base44|createBase44|Base44Client/i;
const LOVABLE_RE = /lovable\.dev|lovableproject|from\s+['"]@\/integrations\/supabase/i;
const BOLT_RE = /bolt\.new|@bolt\//i;
const V0_RE = /v0\.dev|@v0\//i;

export function detectImportedFramework(files: ZipImportFile[]): FrameworkDetection {
  const paths = files.map((f) => norm(f.path));
  const combined = files.map((f) => f.content).join("\n");
  const pkg = readPackageJson(files);
  const packageManager = detectPackageManager(files);
  const entryFiles = collectEntryFiles(files);
  const hasViteConfig = paths.some((p) => /^vite\.config\.(ts|js|mjs)$/i.test(p));
  const hasNextConfig = paths.some((p) => /^next\.config\.(ts|js|mjs)$/i.test(p));
  const hasAppPage = paths.some((p) => /^app\/page\.(tsx|jsx|ts|js)$/i.test(p));
  const hasPagesIndex = paths.some((p) => /^pages\/index\.(tsx|jsx|ts|js)$/i.test(p));
  const hasIndexHtml = paths.some((p) => p === "index.html" || p.endsWith("/index.html"));
  const hasMain = paths.some((p) => /^src\/main\.(tsx|jsx)$/i.test(p));

  let legacy: DetectedFrameworkId | null = null;
  if (BASE44_RE.test(combined)) legacy = "base44";
  else if (LOVABLE_RE.test(combined)) legacy = "lovable";
  else if (BOLT_RE.test(combined)) legacy = "bolt";
  else if (V0_RE.test(combined)) legacy = "v0";

  if (pkg) {
    const { deps, scripts } = pkg;
    if (deps.next || hasNextConfig || hasAppPage || hasPagesIndex) {
      const isSsrNext =
        Boolean(deps.next) &&
        !scripts.export &&
        !combined.includes("output: 'export'") &&
        !combined.includes('output: "export"');
      if (hasAppPage) {
        return {
          id: legacy === "base44" ? "base44" : legacy === "lovable" ? "lovable" : "nextjs_app",
          label: legacy ? `Next.js (App Router) · ${legacy}` : "Next.js (App Router)",
          confidence: 0.95,
          entryFiles,
          packageManager,
          scripts,
          hasViteConfig,
          hasNextConfig,
          isSsrNext,
        };
      }
      return {
        id: legacy === "base44" ? "base44" : "nextjs_pages",
        label: legacy ? `Next.js (Pages) · ${legacy}` : "Next.js (Pages)",
        confidence: 0.9,
        entryFiles,
        packageManager,
        scripts,
        hasViteConfig,
        hasNextConfig,
        isSsrNext,
      };
    }
    if (deps["react-scripts"]) {
      return {
        id: "cra",
        label: "Create React App",
        confidence: 0.9,
        entryFiles,
        packageManager,
        scripts,
        hasViteConfig,
        hasNextConfig,
        isSsrNext: false,
      };
    }
    if (deps.vite || hasViteConfig || (hasIndexHtml && hasMain)) {
      return {
        id: legacy === "lovable" ? "lovable" : legacy === "base44" ? "base44" : "vite",
        label: legacy ? `Vite · ${legacy}` : "Vite",
        confidence: 0.92,
        entryFiles,
        packageManager,
        scripts,
        hasViteConfig,
        hasNextConfig,
        isSsrNext: false,
      };
    }
    if (deps.react || deps["react-dom"]) {
      return {
        id: legacy ?? "react",
        label: legacy ? `React · ${legacy}` : "React",
        confidence: 0.8,
        entryFiles,
        packageManager,
        scripts,
        hasViteConfig,
        hasNextConfig,
        isSsrNext: false,
      };
    }
  }

  if (hasIndexHtml && !pkg) {
    return {
      id: "static",
      label: "Static HTML",
      confidence: 0.85,
      entryFiles,
      packageManager,
      scripts: {},
      hasViteConfig,
      hasNextConfig,
      isSsrNext: false,
    };
  }

  if (legacy) {
    return {
      id: legacy,
      label: legacy.charAt(0).toUpperCase() + legacy.slice(1),
      confidence: 0.7,
      entryFiles,
      packageManager,
      scripts: pkg?.scripts ?? {},
      hasViteConfig,
      hasNextConfig,
      isSsrNext: false,
    };
  }

  return {
    id: "unknown",
    label: "Unknown",
    confidence: 0.25,
    entryFiles,
    packageManager,
    scripts: pkg?.scripts ?? {},
    hasViteConfig,
    hasNextConfig,
    isSsrNext: false,
  };
}

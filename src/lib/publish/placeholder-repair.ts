import type { PlaceholderFinding } from "@/lib/publish/placeholder-findings";

const REPLACEMENTS: Array<{ re: RegExp; replace: (appName: string) => string }> = [
  {
    re: /coming soon/gi,
    replace: (app) => `Welcome to ${app}`,
  },
  {
    re: /\bTODO:\s*implement\b/gi,
    replace: () => "Get started",
  },
  {
    re: /\bTODO\b/g,
    replace: () => "",
  },
  {
    re: /lorem ipsum/gi,
    replace: (app) => `${app} helps you get things done.`,
  },
  {
    re: /your app will appear here/gi,
    replace: (app) => `${app} is ready.`,
  },
];

export type PlaceholderRepairResult = {
  patched: Array<{ path: string; content: string }>;
  skipped: PlaceholderFinding[];
  safe: boolean;
};

/** Deterministic placeholder cleanup — no AI, no provider calls. */
export function repairPlaceholderContent(input: {
  files: Array<{ path: string; content: string }>;
  findings: PlaceholderFinding[];
  appName: string;
}): PlaceholderRepairResult {
  const byPath = new Map(input.files.map((f) => [f.path, f.content]));
  const touched = new Set<string>();
  const skipped: PlaceholderFinding[] = [];

  for (const finding of input.findings) {
    const content = byPath.get(finding.path);
    if (!content) {
      skipped.push(finding);
      continue;
    }
    let next = content;
    let changed = false;
    for (const rule of REPLACEMENTS) {
      if (rule.re.test(next)) {
        next = next.replace(rule.re, rule.replace(input.appName));
        changed = true;
      }
    }
    if (changed) {
      byPath.set(finding.path, next);
      touched.add(finding.path);
    } else {
      skipped.push(finding);
    }
  }

  const patched = [...touched].map((path) => ({ path, content: byPath.get(path)! }));
  return {
    patched,
    skipped,
    safe: skipped.length === 0,
  };
}

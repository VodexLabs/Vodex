const PLACEHOLDER_PATTERNS: Array<{ id: string; re: RegExp; label: string }> = [
  { id: "coming_soon", re: /coming soon/i, label: "Coming soon" },
  { id: "todo", re: /\bTODO\b/i, label: "TODO" },
  { id: "todo_implement", re: /todo:\s*implement/i, label: "TODO: implement" },
  { id: "lorem", re: /lorem ipsum/i, label: "Lorem ipsum" },
  { id: "placeholder", re: /your app will appear here|under construction|not implemented yet|page under development/i, label: "Placeholder page" },
];

export type PlaceholderFinding = {
  path: string;
  line: number;
  snippet: string;
  patternId: string;
  label: string;
};

export function findPlaceholderFindings(
  files: Array<{ path: string; content: string }>,
): PlaceholderFinding[] {
  const findings: PlaceholderFinding[] = [];
  for (const file of files) {
    if (!/\.(tsx|jsx|html|vue|svelte|mdx?)$/i.test(file.path)) continue;
    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      for (const p of PLACEHOLDER_PATTERNS) {
        if (!p.re.test(line)) continue;
        findings.push({
          path: file.path,
          line: i + 1,
          snippet: line.trim().slice(0, 120),
          patternId: p.id,
          label: p.label,
        });
        break;
      }
    }
  }
  return findings;
}

/** Internal validator reason prefix — filtered from user-facing blockers. */
export function isRawPlaceholderValidatorReason(reason: string): boolean {
  return reason.startsWith("placeholder" + "_content:");
}

/** User-safe publish blocker — never expose raw regex sources. */
export function placeholderBlockerMessage(findings: PlaceholderFinding[]): string {
  if (findings.length === 0) return "Placeholder content detected — replace before publish";
  const files = [...new Set(findings.map((f) => f.path))];
  if (files.length === 1) {
    const f = findings[0]!;
    return `Placeholder content in ${f.path} (line ${f.line})`;
  }
  return `Placeholder content in ${files.length} files — review before publish`;
}

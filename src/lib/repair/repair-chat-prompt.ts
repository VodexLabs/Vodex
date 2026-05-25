import type { PreviewBlockingIssue } from "@/components/preview/preview-error-gate";

export type RepairFileRef = {
  path: string;
  content: string;
};

function findAffectedFiles(
  issue: PreviewBlockingIssue,
  files: RepairFileRef[],
): RepairFileRef[] {
  const haystack = `${issue.title} ${issue.summary} ${issue.details ?? ""}`.toLowerCase();
  const matched = files.filter((f) => haystack.includes(f.path.toLowerCase()));
  if (matched.length > 0) return matched.slice(0, 4);

  const uiCandidates = files.filter(
    (f) =>
      /page\.(tsx|jsx)$/i.test(f.path) ||
      /layout\.(tsx|jsx)$/i.test(f.path) ||
      /preview\/index\.html$/i.test(f.path),
  );
  return (uiCandidates.length > 0 ? uiCandidates : files).slice(0, 4);
}

function snippetWithLines(content: string, maxLines = 48): string {
  const lines = content.split("\n");
  if (lines.length <= maxLines) return content;
  return lines.slice(0, maxLines).join("\n") + `\n… (${lines.length - maxLines} more lines)`;
}

/**
 * Build an Edit-mode chat prompt that references exact files and line context
 * so the model can patch real project code (not placeholders).
 */
export function buildRepairChatPrompt(input: {
  issue: PreviewBlockingIssue;
  files: RepairFileRef[];
  projectName?: string;
}): string {
  const affected = findAffectedFiles(input.issue, input.files);
  const fileBlocks = affected
    .map((f) => {
      const lines = f.content.split("\n");
      const numbered = lines
        .slice(0, 60)
        .map((line, i) => `${String(i + 1).padStart(4, " ")} | ${line}`)
        .join("\n");
      return `### \`${f.path}\` (${lines.length} lines)\n\`\`\`\n${numbered}\n\`\`\``;
    })
    .join("\n\n");

  return [
    `Fix the preview-blocking issue in **${input.projectName ?? "this app"}**.`,
    "",
    `**Problem:** ${input.issue.title}`,
    input.issue.summary,
    issueDetailBlock(input.issue),
    "",
    "You have full access to every project file. Update only the files that need changes.",
    "Return the corrected file(s) with exact paths — replace placeholder/generic UI with real, working UI for this app.",
    "Reference the file name and line numbers when explaining what you changed.",
    "",
    fileBlocks || "_No files loaded yet — inspect the project and fix placeholder patterns._",
    "",
    input.issue.fixHint ? `**Guidance:** ${input.issue.fixHint}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function issueDetailBlock(issue: PreviewBlockingIssue): string {
  if (!issue.details?.trim()) return "";
  return `\n**Details:**\n${issue.details.trim()}`;
}

/**
 * Extract markdown fenced code blocks from assistant text for the Code tab.
 */
export function extractFencedCode(text: string): string {
  if (!text.trim()) return "";
  const re = /```[\w]*\n?([\s\S]*?)```/g;
  const chunks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const inner = m[1]?.trim() ?? "";
    if (inner) chunks.push(inner);
  }
  return chunks.join("\n\n---\n\n");
}

export function hasFencedCode(text: string): boolean {
  return /```[\w]*\n?[\s\S]*?```/.test(text);
}

/** Replace fenced blocks with a short hint for the chat stream. */
export function stripFencedCodeForChat(text: string): string {
  if (!text.trim()) return text;
  return text
    .replace(/```[\w]*\n?[\s\S]*?```/g, "\n\n(Source excerpt moved to the Code tab.)\n\n")
    .trim();
}

/** Parsed file path + body from markdown fences (build mode persistence). */
export function parseFencedFiles(text: string): Array<{ path: string; content: string }> {
  const out: Array<{ path: string; content: string }> = [];
  if (!text.trim()) return out;
  let idx = 0;
  const re =
    /```([^\n`]*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const meta = (m[1] ?? "").trim();
    const content = (m[2] ?? "").trim();
    if (!content) continue;

    let path = "";
    const fileEq = meta.match(/(?:file|path|filename)\s*=\s*["']?([^'"`\s]+)["']?/i);
    const pathLine = meta.match(/^(?:[.\w/@-]+\.[a-z0-9]+)$/i);
    if (fileEq) path = fileEq[1]!.trim();
    else if (pathLine) path = pathLine[0]!.trim();
    else {
      const lang = meta.split(/\s+/)[0];
      if (lang && !lang.includes("=") && lang.length < 20) {
        idx += 1;
        path = `snippet-${idx}.${lang.replace(/[^a-z0-9]/gi, "") || "txt"}`;
      } else {
        idx += 1;
        path = `snippet-${idx}.txt`;
      }
    }

    path = path.replace(/^[`'"]+|[`'"]+$/g, "").replace(/^\.\//, "").trim();
    if (!path || path.length > 512) {
      idx += 1;
      path = `snippet-${idx}.txt`;
    }
    if (path.includes("..") || path.startsWith("/") || path.includes("\\")) continue;

    out.push({ path, content });
  }
  return out;
}

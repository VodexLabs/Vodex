/** Detect TODO/stub/placeholder generated source that should be replaced by scaffold. */

const STUB_PATTERNS = [
  /\bTODO\b/i,
  /\bFIXME\b/i,
  /coming soon/i,
  /not implemented yet/i,
  /page under development/i,
  /under construction/i,
  /placeholder only/i,
  /lorem ipsum/i,
  /your app will appear here/i,
  /waiting for app to be generated/i,
];

export function isGeneratedFileStub(content: string, path?: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return true;
  if (trimmed.length < 40) return true;

  for (const p of STUB_PATTERNS) {
    if (p.test(trimmed)) return true;
  }

  if (/page\.(tsx|jsx)$/i.test(path ?? "")) {
    if (trimmed.length < 120 && !/className=/.test(trimmed)) return true;
    if (/export default function/.test(trimmed) && trimmed.length < 200 && /return\s*\(\s*<div[^>]*>\s*<\/div>/.test(trimmed)) {
      return true;
    }
  }

  return false;
}

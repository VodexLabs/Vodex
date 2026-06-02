/**
 * Safer TSX → static HTML than naive regex (balanced return parens, balanced braces).
 */

const INTRINSIC_TAGS = new Set([
  "a", "article", "aside", "button", "div", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6",
  "header", "img", "input", "label", "li", "main", "nav", "ol", "p", "section", "select", "span",
  "table", "tbody", "td", "th", "thead", "tr", "ul", "svg", "path", "circle",
]);

/** Extract JSX inside `return (...)` or `=> (...)` using balanced parentheses. */
export function extractJsxReturnBody(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) return "";

  const returnParen = trimmed.search(/\breturn\s*\(/);
  const arrowParen = trimmed.search(/=>\s*\(/);

  let openIdx = -1;
  if (returnParen >= 0 && (arrowParen < 0 || returnParen < arrowParen)) {
    openIdx = trimmed.indexOf("(", returnParen);
  } else if (arrowParen >= 0) {
    openIdx = trimmed.indexOf("(", arrowParen);
  }

  if (openIdx < 0) {
    const returnBare = trimmed.search(/\breturn\s+/);
    if (returnBare >= 0) {
      return trimmed.slice(returnBare + 6).replace(/\);?\s*}?\s*$/m, "").trim();
    }
    return trimmed;
  }

  let depth = 0;
  const start = openIdx + 1;
  for (let i = openIdx; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return trimmed.slice(start, i).trim();
    }
  }

  return trimmed.slice(start).trim();
}

/** Remove `{expr}` with balanced-brace matching (handles nested `{cn(...)}`). */
export function stripJsxExpressions(jsx: string): string {
  let out = "";
  let i = 0;
  while (i < jsx.length) {
    if (jsx[i] === "{") {
      let depth = 0;
      let j = i;
      while (j < jsx.length) {
        if (jsx[j] === "{") depth++;
        else if (jsx[j] === "}") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
        j++;
      }
      i = j;
      continue;
    }
    out += jsx[i];
    i++;
  }
  return out;
}

/** Map PascalCase / unknown components to div stubs preserving children. */
export function stubCustomComponents(jsx: string): string {
  return jsx.replace(
    /<\/?([A-Z][A-Za-z0-9]*)\b([^>]*)(\/?)>/g,
    (full, name: string, attrs: string, selfClose: string) => {
      if (full.startsWith("</")) {
        return INTRINSIC_TAGS.has(name.toLowerCase()) ? full : "</div>";
      }
      const lower = name.toLowerCase();
      if (INTRINSIC_TAGS.has(lower)) return full;
      const safeAttrs = attrs.replace(/className=/g, "class=");
      if (selfClose) {
        return `<div data-component="${name}"${safeAttrs} />`;
      }
      return `<div data-component="${name}"${safeAttrs}>`;
    },
  );
}

export function jsxToStaticHtml(content: string): string {
  if (!content.trim()) return "";

  let body = extractJsxReturnBody(content);
  body = stripJsxExpressions(body);
  body = body
    .replace(/className=/g, "class=")
    .replace(/\{`([^`]+)`\}/g, "$1")
    .replace(/\{["']([^"']+)["']\}/g, "$1")
    .replace(/<\/>/g, "")
    .replace(/<>/g, "")
    .replace(/\skey=\{[^}]+\}/g, "")
    .replace(/\skey="[^"]*"/g, "");

  body = stubCustomComponents(body);

  return body.slice(0, 12000);
}

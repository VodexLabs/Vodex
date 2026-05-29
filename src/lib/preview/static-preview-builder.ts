import {
  buildRestaurantInventoryPreviewBody,
  isRestaurantInventoryPreview,
} from "@/lib/preview/restaurant-static-preview";

export type PreviewHtmlOptions = {
  projectId?: string;
  previewSessionId?: string;
  archetypeId?: string | null;
};

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function wrapPreviewDocument(bodyInner: string, options?: PreviewHtmlOptions): string {
  const rootAttrs = [
    'id="dreamos-preview-root"',
    'data-testid="generated-app-preview-root"',
    'data-preview-ready="true"',
    options?.projectId ? `data-project-id="${escapeAttr(options.projectId)}"` : "",
    options?.previewSessionId
      ? `data-preview-session-id="${escapeAttr(options.previewSessionId)}"`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script src="https://cdn.tailwindcss.com"></script>
  <title>DreamOS86 Preview</title>
  <meta name="dreamos-preview" content="static-snapshot" />
  <style>body{margin:0;font-family:Inter,system-ui,sans-serif}</style>
</head>
<body class="bg-slate-50 text-slate-900 antialiased">
  <div ${rootAttrs} class="min-h-screen">${bodyInner}</div>
</body>
</html>`;
}

/** Build a self-contained HTML snapshot from generated files. */
export function buildStaticPreviewHtml(
  files: Array<{ path: string; content: string }>,
  options?: PreviewHtmlOptions,
): string {
  if (files.length === 0 && options?.archetypeId === "restaurant_inventory") {
    return wrapPreviewDocument(buildRestaurantInventoryPreviewBody(), options);
  }

  const html = files.find((f) => f.path === "index.html" || f.path.endsWith("/index.html"));
  if (html?.content?.trim()) {
    if (html.content.includes("generated-app-preview-root")) return html.content;
    return wrapPreviewDocument(
      html.content.replace(/<\/?html[^>]*>|<\/?head[^>]*>|<\/?body[^>]*>/gi, ""),
      options,
    );
  }

  if (isRestaurantInventoryPreview(files, options?.archetypeId)) {
    return wrapPreviewDocument(buildRestaurantInventoryPreviewBody(), options);
  }

  const page =
    files.find((f) => /^app\/page\.(tsx|jsx)$/i.test(f.path.replace(/\\/g, "/"))) ||
    files.find((f) => /^app\/dashboard\/page\.(tsx|jsx)$/i.test(f.path.replace(/\\/g, "/"))) ||
    files.find((f) => /\/page\.(tsx|jsx)$/i.test(f.path)) ||
    files.find((f) => /page\.(tsx|jsx)$/i.test(f.path));
  const jsxBody = page?.content ?? "";
  const rendered = jsxToStaticHtml(jsxBody);
  const inner =
    rendered && !/no renderable content/i.test(rendered)
      ? rendered
      : "<p class=\"p-6 text-slate-500\">No renderable content.</p>";

  return wrapPreviewDocument(inner, options);
}

function jsxToStaticHtml(content: string): string {
  if (!content.trim()) return "";
  let body = content;
  const returnMatch = body.match(/return\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*}/);
  if (returnMatch) body = returnMatch[1] ?? body;
  else body = body.replace(/^[\s\S]*?return\s*/m, "").replace(/\);?\s*}$/m, "");

  return body
    .replace(/className=/g, "class=")
    .replace(/data-testid=/g, "data-testid=")
    .replace(/\{`([^`]+)`\}/g, "$1")
    .replace(/\{["']([^"']+)["']\}/g, "$1")
    .replace(/\{[^}]+\}/g, "")
    .replace(/<\/>/g, "")
    .replace(/<>/g, "")
    .slice(0, 12000);
}

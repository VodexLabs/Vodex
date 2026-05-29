/**
 * Help Center markdown → HTML (links processed before Tailwind bracket classes).
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderHelpMarkdown(md: string): string {
  const codeBlocks: string[] = [];

  let text = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    const safe = escapeHtml(code.trimEnd());
    codeBlocks.push(
      `<pre class="help-code-block my-4 overflow-x-auto rounded-lg bg-muted/60 p-4 text-xs font-mono ring-1 ring-border" data-copyable="true"><code class="language-${escapeHtml(lang)}">${safe}</code></pre>`,
    );
    return `\x00CODE${idx}\x00`;
  });

  text = text.replace(/\[(.+?)\]\((.+?)\)/g, (_, label, href) => {
    const safeHref = escapeHtml(href);
    const safeLabel = escapeHtml(label);
    return `<a href="${safeHref}" class="text-accent hover:underline underline-offset-4">${safeLabel}</a>`;
  });

  text = text.replace(/`([^`\n]+)`/g, (_, code) => {
    return `<code class="rounded bg-muted/60 px-1.5 py-0.5 text-xs font-mono ring-1 ring-border/50">${escapeHtml(code)}</code>`;
  });

  text = text.replace(/^---$/gm, '<hr class="my-6 border-border" />');

  text = text.replace(
    /^## (.+)$/gm,
    '<h2 class="mt-8 mb-3 text-lg font-semibold tracking-tight text-foreground first:mt-0">$1</h2>',
  );
  text = text.replace(/^### (.+)$/gm, '<h3 class="mt-6 mb-2 text-base font-semibold text-foreground">$1</h3>');
  text = text.replace(/^#### (.+)$/gm, '<h4 class="mt-4 mb-2 text-sm font-semibold text-foreground">$1</h4>');

  text = text.replace(/^\|(.+)\|$/gm, (row) => {
    if (/^\|[\s\-:|]+\|$/.test(row)) return "";
    const cells = row.split("|").slice(1, -1).map((c) => c.trim());
    return `<tr>${cells.map((c) => `<td class="border border-border px-3 py-2 text-sm">${c}</td>`).join("")}</tr>`;
  });
  text = text.replace(
    /(<tr>[\s\S]*?<\/tr>)/g,
    (block) =>
      `<div class="my-4 overflow-x-auto rounded-lg ring-1 ring-border"><table class="w-full border-collapse">${block}</table></div>`,
  );

  text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');

  text = text.replace(
    /^\d+\. (.+)$/gm,
    '<li class="ml-5 list-decimal text-sm leading-relaxed text-muted-foreground">$1</li>',
  );
  text = text.replace(
    /^[-*] (.+)$/gm,
    '<li class="ml-5 list-disc text-sm leading-relaxed text-muted-foreground">$1</li>',
  );

  text = text.replace(
    /^> (.+)$/gm,
    '<blockquote class="my-3 border-l-2 border-accent/40 pl-4 text-sm italic text-muted-foreground">$1</blockquote>',
  );

  const lines = text.split("\n");
  const out: string[] = [];
  let para: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    const body = para.join(" ").trim();
    if (body && !body.startsWith("<")) {
      out.push(`<p class="mt-3 text-sm leading-relaxed text-muted-foreground">${body}</p>`);
    } else if (body) {
      out.push(body);
    }
    para = [];
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      flushPara();
      continue;
    }
    if (
      t.startsWith("<h") ||
      t.startsWith("<li") ||
      t.startsWith("<pre") ||
      t.startsWith("<div") ||
      t.startsWith("<blockquote") ||
      t.startsWith("<hr") ||
      t.startsWith("\x00CODE")
    ) {
      flushPara();
      out.push(t);
      continue;
    }
    para.push(t);
  }
  flushPara();

  let html = out.join("\n");
  html = html.replace(/\x00CODE(\d+)\x00/g, (_, i) => codeBlocks[Number(i)] ?? "");

  return html;
}

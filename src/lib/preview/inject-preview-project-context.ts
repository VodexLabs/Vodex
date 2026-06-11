/** Inject project id for preview asset proxy + Ripo lookups. */

export function buildPreviewProjectContextScript(projectId: string): string {
  return `(function(){window.__VODEX_PROJECT_ID__=${JSON.stringify(projectId)};})();`;
}

export function injectPreviewProjectContext(html: string, projectId: string): string {
  if (html.includes("vodex-preview-project-context")) return html;
  const script = `<script id="vodex-preview-project-context" data-vodex-preview-shim="true">${buildPreviewProjectContextScript(projectId)}</script>`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}${script}`);
  }
  return script + html;
}

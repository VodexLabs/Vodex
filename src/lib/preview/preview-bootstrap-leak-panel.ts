import type { DetailedBootstrapLeak } from "@/lib/preview/preview-bootstrap-sanitizer";

/** Inline HTML shown when served preview still has bootstrap path leaks. */
export function buildPreviewBootstrapLeakPanel(input: {
  projectId: string;
  leaks: DetailedBootstrapLeak[];
  hydrationCount: number;
  repairUrl: string;
}): string {
  const rows = input.leaks
    .slice(0, 12)
    .map(
      (l) =>
        `<li><code>${escapeHtml(l.source)}</code> · <code>${escapeHtml(l.pattern)}</code><br/><pre style="white-space:pre-wrap;font-size:11px;margin:4px 0 8px">${escapeHtml(l.snippet)}</pre></li>`,
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Preview bootstrap blocked</title>
<style>
body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:24px}
.card{max-width:720px;margin:0 auto;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px}
h1{font-size:18px;margin:0 0 8px}
p{color:#94a3b8;font-size:14px;line-height:1.5}
button,a.btn{display:inline-block;margin-top:12px;margin-right:8px;padding:10px 14px;border-radius:8px;border:none;background:#2563eb;color:#fff;text-decoration:none;font-size:14px;cursor:pointer}
ul{padding-left:18px}
code{background:#0f172a;padding:2px 4px;border-radius:4px}
</style></head><body><div class="card">
<h1>Preview blocked — bootstrap path leaks</h1>
<p>Served HTML still contains <strong>${input.leaks.length}</strong> unsafe path(s) and <strong>${input.hydrationCount}</strong> hydration reference(s). The imported app would route to the platform preview proxy and show a 404.</p>
<ul>${rows || "<li>No snippet details</li>"}</ul>
<button type="button" onclick="parent.postMessage({type:'vodex-preview-inner-error',kind:'bootstrap_leak_blocked',path:'/'},'*')">Notify parent shell</button>
<a class="btn" href="#" onclick="fetch('${escapeHtml(input.repairUrl)}',{method:'POST',credentials:'include'}).then(()=>location.reload());return false;">Repair and rebuild</a>
</div></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Deterministic solid-gradient initials icon (no transparency). */
export function buildInitialsIconSvg(title: string): string {
  const initial = (title.trim().charAt(0) || "A").toUpperCase();
  const ch = escapeXml(initial);
  const hue = hashHue(title.trim() || "App");
  const c1 = `hsl(${hue}, 72%, 48%)`;
  const c2 = `hsl(${(hue + 36) % 360}, 68%, 38%)`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}"/>
      <stop offset="100%" style="stop-color:${c2}"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="20" ry="20" fill="url(#g)"/>
  <text x="64" y="78" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="52" font-weight="700" fill="#ffffff">${ch}</text>
</svg>`;
}

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

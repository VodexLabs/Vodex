export type EditableRegion = {
  id: string;
  label: string;
  tag: string;
  element: Element;
};

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "SVG", "PATH", "NOSCRIPT", "IFRAME"]);

function labelForElement(el: Element): string {
  const aria = el.getAttribute("aria-label")?.trim();
  if (aria) return aria.slice(0, 48);

  const id = el.id?.trim();
  if (id) return `#${id}`;

  const heading = el.querySelector("h1,h2,h3,h4")?.textContent?.trim();
  if (heading) return heading.slice(0, 48);

  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  if (text.length >= 3) return text.slice(0, 48);

  const cls = typeof el.className === "string" ? el.className.split(/\s+/).find(Boolean) : null;
  if (cls) return `.${cls}`.slice(0, 48);

  return el.tagName.toLowerCase();
}

function isVisible(el: Element): boolean {
  const htmlEl = el as HTMLElement;
  const rect = htmlEl.getBoundingClientRect();
  if (rect.width < 24 || rect.height < 16) return false;
  const style = htmlEl.ownerDocument.defaultView?.getComputedStyle(htmlEl);
  if (!style || style.display === "none" || style.visibility === "hidden" || Number(style.opacity) < 0.05) {
    return false;
  }
  return true;
}

/** Scan iframe/document for real UI regions the user can target for edits. */
export function extractEditableRegions(doc: Document, max = 24): EditableRegion[] {
  const candidates: Element[] = [];
  const root = doc.body ?? doc.documentElement;

  const selector =
    "header, nav, main, footer, section, article, aside, form, " +
    "[role='banner'], [role='navigation'], [role='main'], [role='contentinfo'], " +
    "h1, h2, h3, button, a.btn, [class*='hero'], [class*='card'], [class*='feature'], [class*='navbar'], [class*='header'], [class*='footer']";

  root.querySelectorAll(selector).forEach((el) => {
    if (SKIP_TAGS.has(el.tagName)) return;
    if (!isVisible(el)) return;
    candidates.push(el);
  });

  if (candidates.length === 0) {
    root.querySelectorAll("div, section, main").forEach((el) => {
      if (SKIP_TAGS.has(el.tagName)) return;
      if (!isVisible(el)) return;
      const rect = (el as HTMLElement).getBoundingClientRect();
      if (rect.height >= 40 && rect.width >= 80) candidates.push(el);
    });
  }

  const seen = new Set<Element>();
  const regions: EditableRegion[] = [];

  for (const el of candidates) {
    if (seen.has(el)) continue;
    let dominated = false;
    for (const other of candidates) {
      if (other !== el && other.contains(el) && (other as HTMLElement).getBoundingClientRect().height > (el as HTMLElement).getBoundingClientRect().height * 1.2) {
        dominated = true;
        break;
      }
    }
    if (dominated) continue;
    seen.add(el);
    regions.push({
      id: `region-${regions.length}`,
      label: labelForElement(el),
      tag: el.tagName.toLowerCase(),
      element: el,
    });
    if (regions.length >= max) break;
  }

  return regions.sort((a, b) => {
    const ra = (a.element as HTMLElement).getBoundingClientRect();
    const rb = (b.element as HTMLElement).getBoundingClientRect();
    return ra.top - rb.top || ra.left - rb.left;
  });
}

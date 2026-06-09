/**
 * Navigation guard is handled by inject-preview-virtual-history (clicks, pushState, window.open).
 * Kept for backward-compatible call sites.
 */
export function injectPreviewNavigationGuard(html: string): string {
  return html;
}

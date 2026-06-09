/**
 * Route listener is handled by inject-preview-virtual-history (postMessage vodex:navigate).
 * Kept for backward-compatible call sites.
 */
export function injectPreviewRouteListener(html: string): string {
  return html;
}

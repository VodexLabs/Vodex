import { injectPreviewVirtualHistory } from "@/lib/preview/inject-preview-virtual-history";

/**
 * SPAs using BrowserRouter read `window.location.pathname`. Inside our preview iframe
 * that path is `/api/projects/.../preview-html`, which breaks routing. Virtual history
 * keeps the iframe on the proxy URL while exposing the app route to the bundle.
 */
export function injectPreviewRouterShim(html: string, routePath: string): string {
  return injectPreviewVirtualHistory(html, routePath);
}
